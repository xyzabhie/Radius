/**
 * Project Environment Variable Source.
 * 
 * Reads variables from .rd (YAML) environment files.
 * Follows Radius persistence standards.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { IVariableSource } from '../../types.js';

/**
 * Options for ProjectEnvSource.
 */
export interface ProjectEnvSourceOptions {
    /**
     * Project root directory containing .rd files.
     */
    projectRoot: string;

    /**
     * Name of the environment file (without .rd extension).
     * @default 'environment'
     */
    envName?: string;

    /**
     * Source priority (higher = checked first)
     * @default 300
     */
    priority?: number;
}

/**
 * Variable source that reads from project .rd (YAML) files.
 * Per Radius standards, all project data uses .rd YAML files.
 */
export class ProjectEnvSource implements IVariableSource {
    readonly name = 'ProjectEnv';
    readonly priority: number;

    private projectRoot: string;
    private envName: string;
    private cache: Map<string, string> | null = null;
    private loaded = false;

    /**
     * Create a ProjectEnvSource.
     * @param options - Configuration options
     */
    constructor(options: ProjectEnvSourceOptions) {
        this.projectRoot = options.projectRoot;
        this.envName = options.envName ?? 'environment';
        this.priority = options.priority ?? 300;
    }

    /**
     * Get a variable from the project environment.
     * @param key - Variable name (supports dot notation for nested values)
     * @returns Variable value or undefined
     */
    async get(key: string): Promise<string | undefined> {
        await this.ensureLoaded();

        // Support both flat keys and dot notation
        const value = this.cache?.get(key);
        if (value !== undefined) {
            return value;
        }

        return undefined;
    }

    /**
     * Force reload of .rd file.
     */
    async reload(): Promise<void> {
        this.loaded = false;
        this.cache = null;
        await this.ensureLoaded();
    }

    /**
     * Ensure .rd file is loaded into cache.
     */
    private async ensureLoaded(): Promise<void> {
        if (this.loaded) {
            return;
        }

        this.cache = new Map();
        const filePath = path.join(this.projectRoot, `${this.envName}.rd`);

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = yaml.load(content) as Record<string, unknown>;

            // Flatten nested objects with dot notation
            this.flattenToCache(data, '');
        } catch (error) {
            // File not found is OK
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }

        this.loaded = true;
    }

    /**
     * Flatten a nested object into the cache with dot notation keys.
     */
    private flattenToCache(obj: Record<string, unknown>, prefix: string): void {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (value === null || value === undefined) {
                continue;
            }

            if (typeof value === 'object' && !Array.isArray(value)) {
                // Recurse into nested objects
                this.flattenToCache(value as Record<string, unknown>, fullKey);
            } else {
                // Store primitive values as strings
                this.cache!.set(fullKey, String(value));
            }
        }
    }
}
