/**
 * DotEnv File Variable Source.
 * 
 * Reads variables from .env files using the dotenv package.
 * 
 * v1.2.0: Platform-agnostic via IFileSystem.
 */

import { parse as parseDotEnv } from 'dotenv';
import type { IVariableSource } from '../../types.js';
import type { IFileSystem } from '../../../types/filesystem.js';

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

    /**
     * File System Adapter (required)
     */
    fs: IFileSystem;

    /**
     * Project Root (required for resolving relative paths)
     */
    projectRoot: string;
}

/**
 * Variable source that reads from .env files.
 * Supports both .env and .env.local files.
 */
export class DotEnvSource implements IVariableSource {
    readonly name = 'DotEnv';
    readonly priority: number;

    private readonly fs: IFileSystem;
    private readonly projectRoot: string;
    private envPath: string;
    private loadLocal: boolean;
    private cache: Map<string, string> | null = null;
    private loaded = false;

    /**
     * Create a DotEnvSource.
     * @param options - Configuration options
     */
    constructor(options: DotEnvSourceOptions) {
        this.envPath = options.path ?? '.env';
        this.loadLocal = options.loadLocal ?? true;
        this.priority = options.priority ?? 200;
        this.fs = options.fs;
        this.projectRoot = options.projectRoot;
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
            // naive check for absolute path (starts with / or X:\)
            // A robust check would invoke fs.isAbsolute provided by IFileSystem or similar util
            // For now, we assume if it doesn't look absolute, join it.
            const isAbsolute = filePath.startsWith('/') || /^[a-zA-Z]:\\/.test(filePath);

            const absolutePath = isAbsolute
                ? filePath
                : await this.fs.join(this.projectRoot, filePath);

            const content = await this.fs.readTextFile(absolutePath);
            const parsed = parseDotEnv(content);

            // Merge into cache (later files overwrite earlier ones)
            for (const [key, value] of Object.entries(parsed)) {
                if (value !== undefined) {
                    this.cache!.set(key, value);
                }
            }
        } catch (error) {
            // File not found is OK, ignore.
        }
    }
}
