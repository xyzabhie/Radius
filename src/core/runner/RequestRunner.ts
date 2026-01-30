/**
 * Request Runner - Main orchestrator for executing .rd files.
 * 
 * Ties together: Parser → Resolver → Pre-Script → HttpClient → Post-Script
 */

import * as path from 'node:path';
import type { RadiusRequest, RadiusResponse, IVariableSource, RunnerOptions } from './types.js';
import { YamlParser } from './parser/YamlParser.js';
import { VariableResolver } from './resolver/VariableResolver.js';
import { SystemEnvSource } from './resolver/sources/SystemEnvSource.js';
import { DotEnvSource } from './resolver/sources/DotEnvSource.js';
import { HttpClient } from './client/HttpClient.js';
import { ScriptSandbox } from './sandbox/ScriptSandbox.js';
import type { SessionManager } from '../session/SessionManager.js';

/**
 * Main entry point for executing Radius requests.
 */
export class RequestRunner {
    private readonly parser: YamlParser;
    private resolver: VariableResolver;
    private readonly client: HttpClient;
    private readonly sandbox: ScriptSandbox;
    private readonly options: RunnerOptions;
    private session: SessionManager | null = null;

    constructor(options: RunnerOptions = {}) {
        this.options = options;

        // Initialize parser with schema path
        const schemaPath = options.projectRoot
            ? path.join(options.projectRoot, 'schemas', 'request.schema.json')
            : path.join(process.cwd(), 'schemas', 'request.schema.json');
        this.parser = new YamlParser(schemaPath);

        // Build variable sources
        const sources = this.buildVariableSources(options);
        this.resolver = new VariableResolver(sources, { strict: false });

        // Initialize HTTP client
        this.client = new HttpClient({ timeout: options.timeout });

        // Initialize script sandbox
        this.sandbox = new ScriptSandbox({ timeout: options.scriptTimeout });
    }

    /**
     * Set the session manager for request chaining.
     * Session variables take highest priority in variable resolution.
     */
    setSession(session: SessionManager): void {
        this.session = session;

        // Rebuild resolver with session source at highest priority
        const sources = this.buildVariableSources(this.options);
        sources.unshift(session.getVariableSource());
        this.resolver = new VariableResolver(sources, { strict: false });
    }

    /**
     * Get the current session manager.
     */
    getSession(): SessionManager | null {
        return this.session;
    }

    /**
     * Execute a .rd file by path.
     * @param filePath - Path to the .rd file
     * @returns RadiusResponse with timing and results
     */
    async run(filePath: string): Promise<RadiusResponse> {
        // Parse the .rd file
        const request = await this.parser.parse(filePath);
        return this.execute(request);
    }

    /**
     * Execute a RadiusRequest object directly.
     * @param request - Parsed request definition
     * @returns RadiusResponse with timing and results
     */
    async execute(request: RadiusRequest): Promise<RadiusResponse> {
        // Reset sandbox for fresh execution but preserve session variables
        this.sandbox.resetContext();

        // Inject session variables into sandbox if available
        if (this.session) {
            this.sandbox.setVariables(this.session.getAll());
        }

        // 1. Resolve all variables in the request
        const resolved = await this.resolver.resolveObject(request);

        // 2. Run pre-request script if present
        if (resolved.scripts?.pre) {
            const preResult = await this.sandbox.runPre(resolved.scripts.pre);
            if (!preResult.success) {
                // Return error response if pre-script fails
                return this.createErrorResponse(
                    `Pre-script error: ${preResult.error}`,
                    resolved.request.method,
                    resolved.request.url
                );
            }

            // Persist pre-script variables to session
            if (this.session && Object.keys(preResult.variables).length > 0) {
                this.session.merge(preResult.variables);
            }
        }

        // 3. Execute the HTTP request
        const response = await this.client.execute(resolved);

        // 4. Run post-response script if present
        if (resolved.scripts?.post) {
            const postResult = await this.sandbox.runPost(resolved.scripts.post, response);
            if (!postResult.success) {
                // Log error but don't fail the response
                console.warn(`Post-script error: ${postResult.error}`);
            }

            // Persist post-script variables to session
            if (this.session && Object.keys(postResult.variables).length > 0) {
                this.session.merge(postResult.variables);
            }

            // Add script logs to response for debugging
            if (postResult.logs.length > 0) {
                (response as any)._scriptLogs = postResult.logs;
            }

            // Add assertion results
            if (postResult.assertions.length > 0) {
                (response as any)._assertions = postResult.assertions;
            }
        }

        return response;
    }

    /**
     * Execute a request with a custom variable context.
     * Useful for chaining requests where one provides variables to another.
     */
    async executeWithVariables(
        request: RadiusRequest,
        variables: Record<string, unknown>
    ): Promise<RadiusResponse> {
        this.sandbox.setVariables(variables);
        return this.execute(request);
    }

    /**
     * Get the script sandbox for inspecting execution state.
     */
    getSandbox(): ScriptSandbox {
        return this.sandbox;
    }

    /**
     * Build variable sources based on options.
     */
    private buildVariableSources(options: RunnerOptions): IVariableSource[] {
        const sources: IVariableSource[] = [];

        // Add user-provided sources first (highest priority)
        if (options.variableSources) {
            sources.push(...options.variableSources);
        }

        // Add DotEnv source
        if (options.envPath) {
            sources.push(new DotEnvSource({ path: options.envPath, priority: 200 }));
        } else {
            sources.push(new DotEnvSource({ priority: 200 }));
        }

        // Add System env source (lowest priority)
        sources.push(new SystemEnvSource(100));

        return sources;
    }

    /**
     * Create an error response.
     */
    private createErrorResponse(
        message: string,
        method: string,
        url: string
    ): RadiusResponse {
        return {
            status: 0,
            statusText: 'Error',
            headers: {},
            body: message,
            json: null,
            timing: { total: 0 },
            request: { method, url, headers: {} },
        };
    }
}
