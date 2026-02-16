/**
 * System Environment Variable Source.
 * 
 * Reads variables from process.env (system environment variables).
 */

import type { IVariableSource } from '../../types.js';

/**
 * Variable source that reads from system environment variables.
 */
export class SystemEnvSource implements IVariableSource {
    readonly name = 'SystemEnv';
    readonly priority: number;

    /**
     * Create a SystemEnvSource.
     * @param priority - Source priority (default: 100, higher = checked first)
     */
    constructor(priority = 100) {
        this.priority = priority;
    }

    /**
     * Get a variable from system environment.
     * @param key - Environment variable name
     * @returns Variable value or undefined
     */
    async get(key: string): Promise<string | undefined> {
        return process.env[key];
    }
}
