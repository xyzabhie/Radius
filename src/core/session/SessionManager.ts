/**
 * Session Manager for Radius.
 * 
 * Maintains shared variable state across multiple request executions
 * enabling request chaining.
 */

import * as fs from 'node:fs/promises';
import type { IVariableSource } from '../runner/types.js';

/**
 * Session variable source with highest priority.
 */
class SessionVariableSource implements IVariableSource {
    readonly name = 'Session';
    readonly priority: number;

    constructor(
        private readonly session: SessionManager,
        priority = 500
    ) {
        this.priority = priority;
    }

    async get(key: string): Promise<string | undefined> {
        const value = this.session.get(key);
        return value !== undefined ? String(value) : undefined;
    }
}

/**
 * Options for SessionManager.
 */
export interface SessionManagerOptions {
    /** Initial variables to populate */
    initialVariables?: Record<string, unknown>;

    /** Priority for variable resolution (default: 500 - highest) */
    priority?: number;
}

/**
 * Manages session state across multiple request executions.
 */
export class SessionManager {
    private variables: Map<string, unknown> = new Map();
    private readonly priority: number;

    constructor(options: SessionManagerOptions = {}) {
        this.priority = options.priority ?? 500;

        // Populate initial variables
        if (options.initialVariables) {
            for (const [key, value] of Object.entries(options.initialVariables)) {
                this.variables.set(key, value);
            }
        }
    }

    /**
     * Get a variable value.
     */
    get(key: string): unknown {
        return this.variables.get(key);
    }

    /**
     * Set a variable value.
     */
    set(key: string, value: unknown): void {
        this.variables.set(key, value);
    }

    /**
     * Delete a variable.
     */
    delete(key: string): boolean {
        return this.variables.delete(key);
    }

    /**
     * Check if a variable exists.
     */
    has(key: string): boolean {
        return this.variables.has(key);
    }

    /**
     * Get all variables as a plain object.
     */
    getAll(): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, value] of this.variables) {
            result[key] = value;
        }
        return result;
    }

    /**
     * Merge variables from another object.
     * Existing keys will be overwritten.
     */
    merge(variables: Record<string, unknown>): void {
        for (const [key, value] of Object.entries(variables)) {
            this.variables.set(key, value);
        }
    }

    /**
     * Clear all variables.
     */
    clear(): void {
        this.variables.clear();
    }

    /**
     * Get the number of variables.
     */
    get size(): number {
        return this.variables.size;
    }

    /**
     * Get a variable source for the resolver.
     */
    getVariableSource(): IVariableSource {
        return new SessionVariableSource(this, this.priority);
    }

    /**
     * Export variables to a JSON file.
     */
    async saveToFile(filePath: string): Promise<void> {
        const data = JSON.stringify(this.getAll(), null, 2);
        await fs.writeFile(filePath, data, 'utf-8');
    }

    /**
     * Load variables from a JSON file.
     */
    async loadFromFile(filePath: string): Promise<void> {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content) as Record<string, unknown>;
        this.merge(data);
    }
}
