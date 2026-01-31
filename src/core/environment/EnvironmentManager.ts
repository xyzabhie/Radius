/**
 * Environment Manager for Radius.
 * 
 * Manages environment profiles with variable hierarchy and secret masking.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { IVariableSource } from '../runner/types.js';

/**
 * Environment profile structure (from .rd file).
 */
export interface EnvironmentProfile {
    /** Profile name */
    name: string;

    /** Base URL for API requests */
    baseUrl?: string;

    /** Variables specific to this environment */
    variables: Record<string, string>;

    /** List of variable names that should be masked in output */
    secrets: string[];
}

/**
 * Options for EnvironmentManager.
 */
export interface EnvironmentManagerOptions {
    /** Project root directory */
    projectRoot: string;

    /** Environments directory name (default: 'environments') */
    environmentsDir?: string;
}

/**
 * Variable source backed by an environment profile.
 */
class EnvironmentVariableSource implements IVariableSource {
    readonly name: string;
    readonly priority: number;

    constructor(
        private readonly profile: EnvironmentProfile,
        priority = 400
    ) {
        this.name = `Environment:${profile.name}`;
        this.priority = priority;
    }

    async get(key: string): Promise<string | undefined> {
        // Check for special keys
        if (key === 'baseUrl') {
            return this.profile.baseUrl;
        }
        return this.profile.variables[key];
    }
}

/**
 * Manages environment profiles and secret masking.
 */
export class EnvironmentManager {
    private readonly projectRoot: string;
    private readonly environmentsDir: string;
    private profile: EnvironmentProfile | null = null;
    private secretValues: Set<string> = new Set();

    constructor(options: EnvironmentManagerOptions) {
        this.projectRoot = options.projectRoot;
        this.environmentsDir = options.environmentsDir ?? 'environments';
    }

    /**
     * Load an environment profile by name.
     * @param name - Environment name (without .rd extension)
     */
    async load(name: string): Promise<EnvironmentProfile> {
        const filePath = path.join(
            this.projectRoot,
            this.environmentsDir,
            `${name}.rd`
        );

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = yaml.load(content) as Record<string, unknown>;

            this.profile = {
                name: (data.name as string) ?? name,
                baseUrl: data.baseUrl as string | undefined,
                variables: (data.variables as Record<string, string>) ?? {},
                secrets: (data.secrets as string[]) ?? [],
            };

            // Cache secret values for masking
            this.secretValues.clear();
            for (const secretKey of this.profile.secrets) {
                const value = this.profile.variables[secretKey];
                if (value) {
                    this.secretValues.add(value);
                }
            }

            return this.profile;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(`Environment not found: ${name} (${filePath})`);
            }
            throw error;
        }
    }

    /**
     * Get the current profile.
     */
    getProfile(): EnvironmentProfile | null {
        return this.profile;
    }

    /**
     * Get a variable source for the current profile.
     * Returns null if no profile is loaded.
     */
    getVariableSource(): IVariableSource | null {
        if (!this.profile) {
            return null;
        }
        return new EnvironmentVariableSource(this.profile);
    }

    /**
     * Check if a variable name is marked as secret.
     */
    isSecret(name: string): boolean {
        return this.profile?.secrets.includes(name) ?? false;
    }

    /**
     * Mask secret values in a string.
     * Replaces any secret value with ********.
     */
    maskSecrets(text: string): string {
        let masked = text;
        for (const secret of this.secretValues) {
            if (secret && secret.length > 0) {
                // Use global replace
                masked = masked.split(secret).join('********');
            }
        }
        return masked;
    }

    /**
     * Mask secrets in an object (recursively).
     */
    maskSecretsInObject<T>(obj: T): T {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (typeof obj === 'string') {
            return this.maskSecrets(obj) as T;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.maskSecretsInObject(item)) as T;
        }

        if (typeof obj === 'object') {
            const result: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this.maskSecretsInObject(value);
            }
            return result as T;
        }

        return obj;
    }

    /**
     * List available environment profiles.
     */
    async listProfiles(): Promise<string[]> {
        const dirPath = path.join(this.projectRoot, this.environmentsDir);

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            return entries
                .filter(e => e.isFile() && e.name.endsWith('.rd'))
                .map(e => e.name.replace('.rd', ''))
                .sort();
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
}
