/**
 * DotEnv File Variable Source.
 * 
 * Reads variables from .env files using the dotenv package.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse as parseDotEnv } from 'dotenv';
import type { IVariableSource } from '../../types.js';

/**
 * Options for DotEnvSource.
 */
export interface DotEnvSourceOptions {
    /**
     * Path to the .env file.
     * @default '.env'
     */
    path?: string;

    /**
     * If true, also load .env.local (higher priority than .env)
     * @default true
     */
    loadLocal?: boolean;

    /**
     * Source priority (higher = checked first)
     * @default 200
     */
    priority?: number;
}

/**
 * Variable source that reads from .env files.
 * Supports both .env and .env.local files.
 */
export class DotEnvSource implements IVariableSource {
    readonly name = 'DotEnv';
    readonly priority: number;

    private envPath: string;
    private loadLocal: boolean;
    private cache: Map<string, string> | null = null;
    private loaded = false;

    /**
     * Create a DotEnvSource.
     * @param options - Configuration options
     */
    constructor(options: DotEnvSourceOptions = {}) {
        this.envPath = options.path ?? '.env';
        this.loadLocal = options.loadLocal ?? true;
        this.priority = options.priority ?? 200;
    }

    /**
     * Get a variable from the loaded .env file(s).
     * @param key - Variable name
     * @returns Variable value or undefined
     */
    async get(key: string): Promise<string | undefined> {
        await this.ensureLoaded();
        return this.cache?.get(key);
    }

    /**
     * Force reload of .env files.
     */
    async reload(): Promise<void> {
        this.loaded = false;
        this.cache = null;
        await this.ensureLoaded();
    }

    /**
     * Ensure .env files are loaded into cache.
     */
    private async ensureLoaded(): Promise<void> {
        if (this.loaded) {
            return;
        }

        this.cache = new Map();

        // Load base .env file
        await this.loadFile(this.envPath);

        // Load .env.local (higher priority, overwrites base)
        if (this.loadLocal) {
            const localPath = this.envPath + '.local';
            await this.loadFile(localPath);
        }

        this.loaded = true;
    }

    /**
     * Load a single .env file into cache.
     */
    private async loadFile(filePath: string): Promise<void> {
        try {
            const absolutePath = path.isAbsolute(filePath)
                ? filePath
                : path.resolve(process.cwd(), filePath);

            const content = await fs.readFile(absolutePath, 'utf-8');
            const parsed = parseDotEnv(content);

            // Merge into cache (later files overwrite earlier ones)
            for (const [key, value] of Object.entries(parsed)) {
                if (value !== undefined) {
                    this.cache!.set(key, value);
                }
            }
        } catch (error) {
            // File not found is OK, just skip it
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }
    }
}
