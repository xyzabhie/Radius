/**
 * Script Sandbox for secure script execution.
 * 
 * Uses Node's vm module to create isolated execution contexts.
 * Blocks access to dangerous APIs like process, fs, require.
 */

import vm from 'node:vm';
import type { RadiusResponse } from '../types.js';
import { RadiusContextImpl } from './context/RadiusContext.js';
import { ResponseContextImpl } from './context/ResponseContext.js';

/**
 * Options for ScriptSandbox.
 */
export interface SandboxOptions {
    /** Script execution timeout in milliseconds (default: 5000) */
    timeout?: number;

    /** Environment variables available to scripts */
    env?: Record<string, string | undefined>;
}

/**
 * Result of script execution.
 */
export interface ScriptResult {
    /** Whether execution completed successfully */
    success: boolean;

    /** Error message if execution failed */
    error?: string;

    /** Captured console.log output */
    logs: string[];

    /** Variables set by the script */
    variables: Record<string, unknown>;

    /** Assertion results from radius.expect() */
    assertions: Array<{
        passed: boolean;
        message: string;
        expected?: unknown;
        actual?: unknown;
    }>;
}

/**
 * Secure sandbox for executing pre/post scripts.
 */
export class ScriptSandbox {
    private readonly timeout: number;
    private readonly env: Record<string, string | undefined>;
    private context: RadiusContextImpl;

    constructor(options: SandboxOptions = {}) {
        this.timeout = options.timeout ?? 5000;
        this.env = options.env ?? process.env;
        this.context = new RadiusContextImpl(this.env);
    }

    /**
     * Run a pre-request script.
     * @param script - JavaScript code to execute
     * @returns Script execution result
     */
    async runPre(script: string): Promise<ScriptResult> {
        return this.executeScript(script, null);
    }

    /**
     * Run a post-response script.
     * @param script - JavaScript code to execute
     * @param response - The HTTP response to make available
     * @returns Script execution result
     */
    async runPost(script: string, response: RadiusResponse): Promise<ScriptResult> {
        return this.executeScript(script, response);
    }

    /**
     * Get the current context (for accessing variables set by scripts).
     */
    getContext(): RadiusContextImpl {
        return this.context;
    }

    /**
     * Reset the context (clear all variables).
     */
    resetContext(): void {
        this.context = new RadiusContextImpl(this.env);
    }

    /**
     * Set initial variables before script execution.
     */
    setVariables(vars: Record<string, unknown>): void {
        this.context.setVariables(vars);
    }

    /**
     * Execute a script in an isolated context.
     */
    private async executeScript(script: string, response: RadiusResponse | null): Promise<ScriptResult> {
        // Create safe console that captures output
        const consoleLogs: string[] = [];
        const safeConsole = {
            log: (...args: unknown[]) => {
                consoleLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
            },
            info: (...args: unknown[]) => safeConsole.log(...args),
            warn: (...args: unknown[]) => safeConsole.log('[WARN]', ...args),
            error: (...args: unknown[]) => safeConsole.log('[ERROR]', ...args),
            debug: (...args: unknown[]) => safeConsole.log('[DEBUG]', ...args),
        };

        // Build the sandbox context
        const sandbox: Record<string, unknown> = {
            // Our APIs
            radius: this.context,
            console: safeConsole,

            // Safe built-ins
            JSON,
            Math,
            Date,
            Array,
            Object,
            String,
            Number,
            Boolean,
            RegExp,
            Error,
            TypeError,
            RangeError,
            parseInt,
            parseFloat,
            isNaN,
            isFinite,
            encodeURI,
            decodeURI,
            encodeURIComponent,
            decodeURIComponent,
            undefined,
            NaN,
            Infinity,

            // Explicitly blocked (set to undefined to prevent access)
            process: undefined,
            require: undefined,
            module: undefined,
            exports: undefined,
            __dirname: undefined,
            __filename: undefined,
            global: undefined,
            globalThis: undefined,
            fetch: undefined,
            XMLHttpRequest: undefined,
            WebSocket: undefined,
            Buffer: undefined,
            setTimeout: undefined,
            setInterval: undefined,
            setImmediate: undefined,
            clearTimeout: undefined,
            clearInterval: undefined,
            clearImmediate: undefined,
        };

        // Add response context for post-scripts
        if (response) {
            sandbox.response = new ResponseContextImpl(response);
        }

        // Create isolated context
        const context = vm.createContext(sandbox, {
            name: 'RadiusScriptSandbox',
        });

        try {
            // Compile and run the script
            const vmScript = new vm.Script(script, {
                filename: 'script.js',
            });

            vmScript.runInContext(context, {
                timeout: this.timeout,
                displayErrors: true,
            });

            return {
                success: true,
                logs: [...consoleLogs, ...this.context.logs],
                variables: this.context.getVariables(),
                assertions: [...this.context.assertions],
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            return {
                success: false,
                error: errorMessage,
                logs: [...consoleLogs, ...this.context.logs],
                variables: this.context.getVariables(),
                assertions: [...this.context.assertions],
            };
        }
    }
}
