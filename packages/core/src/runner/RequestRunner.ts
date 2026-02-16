/**
 * Request Runner - Main orchestrator for executing .rd files.
 * 
 * Ties together: Parser → Resolver → Pre-Script → HttpClient → Post-Script
 * 
 * v1.2.0: Platform-agnostic via IFileSystem.
 */

import type { RadiusRequest, RadiusResponse, IVariableSource, RunnerOptions } from './types.js';
import { YamlParser } from './parser/YamlParser.js';
import { VariableResolver } from './resolver/VariableResolver.js';
import { SystemEnvSource } from './resolver/sources/SystemEnvSource.js';
import { DotEnvSource } from './resolver/sources/DotEnvSource.js';
// Remove hard import of HttpClient to avoid bundling undici in browser
import { ScriptSandbox } from './sandbox/ScriptSandbox.js';
import type { SessionManager } from '../session/SessionManager.js';
import type { IFileSystem } from '../types/filesystem.js';
import { IHttpClient } from '../types/http.js';

/**
 * Main entry point for executing Radius requests.
 */
export class RequestRunner {
    private readonly parser: YamlParser;
    private resolver: VariableResolver;
    private readonly client: IHttpClient;
    private readonly sandbox: ScriptSandbox;
    private readonly options: RunnerOptions;
    private readonly fs: IFileSystem;
    private session: SessionManager | null = null;
    private readonly projectRoot: string;

    constructor(options: RunnerOptions) {
        this.options = options;
        this.fs = options.fs;
        this.projectRoot = options.projectRoot ?? '.';

        // Resolve schema path relative to project root or use provided
        // We assume the schema is located at <projectRoot>/schemas/request.schema.json
        // In a real bundled scenario, the caller should ensure this path is correct or pre-copy the schema.
        // For CLI, we will handle this in the adapter creation.
        // For GUI, we will handle this via Tauri resource path resolving.
        const schemaPath = this.projectRoot + '/schemas/request.schema.json';
        // Note: Simple string concatenation is used here to avoid async path.join in constructor.
        // The YamlParser will use fs.readTextFile(schemaPath), which should handle standard paths.
        // Ideally, we move this to an async initialize method or require schemaPath in options.

        this.parser = new YamlParser(schemaPath, this.fs);

        // Build variable sources
        const sources = this.buildVariableSources(options);
        this.resolver = new VariableResolver(sources, { strict: false });

        // Initialize HTTP client
        if (!options.httpClient) {
            throw new Error("httpClient must be provided to RequestRunner options");
        }
        this.client = options.httpClient;

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
        // Use this.options to preserve variableSources (including environment)
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
    async run(filePath: string, signal?: AbortSignal): Promise<RadiusResponse> {
        // Parse the .rd file
        const request = await this.parser.parse(filePath);
        return this.execute(request, signal);
    }

    /**
     * Execute a RadiusRequest object directly.
     * @param request - Parsed request definition
     * @param signal - Optional AbortSignal for cancellation
     * @returns RadiusResponse with timing and results
     */
    async execute(request: RadiusRequest, signal?: AbortSignal): Promise<RadiusResponse> {
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

        // 2.5. Apply Authentication (Inject Headers/Params)
        this.applyAuth(resolved);

        // 3. Execute the HTTP request
        const response = await this.client.execute(resolved, signal);

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
     * Apply authentication configuration to request headers/params.
     */
    private applyAuth(req: RadiusRequest): void {
        const auth = req.auth || req.request.auth; // V2: can be top-level or in request

        if (!auth || auth.type === 'none' || auth.enabled === false) {
            return;
        }

        // Ensure headers array exists
        if (!req.request.headers) req.request.headers = [];

        if (auth.type === 'bearer' && auth.token) {
            req.request.headers.push({
                key: 'Authorization',
                value: `Bearer ${auth.token}`,
                enabled: true
            });
        }

        if (auth.type === 'basic' && (auth.username || auth.password)) {
            const user = auth.username || '';
            const pass = auth.password || '';
            const credentials = btoa(`${user}:${pass}`);
            req.request.headers.push({
                key: 'Authorization',
                value: `Basic ${credentials}`,
                enabled: true
            });
        }

        if (auth.type === 'api-key' && auth.key && auth.value) {
            if (auth.in === 'query') {
                if (!req.request.params) req.request.params = [];
                req.request.params.push({
                    key: auth.key,
                    value: auth.value,
                    enabled: true
                });
            } else {
                // Default to header
                req.request.headers.push({
                    key: auth.key,
                    value: auth.value,
                    enabled: true
                });
            }
        }
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
        // Now requires fs and projectRoot
        sources.push(new DotEnvSource({
            path: options.envPath ?? '.env',
            priority: 200,
            fs: this.fs,
            projectRoot: this.projectRoot
        }));

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
