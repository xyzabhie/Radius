/**
 * Environment Manager for Radius.
 * 
 * Manages environment profiles with variable hierarchy and secret masking.
 * 
 * v1.2.0: Now platform-agnostic via IFileSystem injection.
 */

import yaml from 'js-yaml';
import type { IVariableSource } from '../runner/types.js';
import { DotEnvSource } from '../runner/resolver/sources/DotEnvSource.js';
import type { IFileSystem } from '../types/filesystem.js';
import { EnvironmentProfile, VariableDefinition } from './EnvironmentProfile.js';

/**
 * Options for EnvironmentManager.
 */
export interface EnvironmentManagerOptions {
    /** Project root directory (Workspace) */
    projectRoot: string;

    /** Global root directory (AppData) */
    globalRoot: string;

    /** File System Adapter */
    fs: IFileSystem;

    /** Environments directory name (default: 'environments') */
    environmentsDir?: string;
}

/**
 * Variable source backed by an environment profile.
 * Flattens V2 structure to simple Key-Value pairs.
 */
class EnvironmentVariableSource implements IVariableSource {
    readonly name: string;
    readonly priority: number;

    constructor(
        private readonly profile: EnvironmentProfile,
        priority = 400
    ) {
        this.name = `Environment:${profile.meta.name}`;
        this.priority = priority;
    }

    async get(key: string): Promise<string | undefined> {
        const def = this.profile.variables[key];
        if (!def || !def.enabled) {
            return undefined;
        }
        return def.value;
    }
}

/**
 * Manages environment profiles and secret masking.
 * Supports Hybrid Architecture: Global (User) + Project (Workspace).
 */
export class EnvironmentManager {
    private readonly projectRoot: string;
    private readonly globalRoot: string;
    private readonly environmentsDir: string;
    private readonly fs: IFileSystem;
    private profile: EnvironmentProfile | null = null;
    private secretValues: Set<string> = new Set();
    private dotEnvSource: DotEnvSource;

    constructor(options: EnvironmentManagerOptions) {
        this.projectRoot = options.projectRoot;
        this.globalRoot = options.globalRoot;
        this.environmentsDir = options.environmentsDir ?? 'environments';
        this.fs = options.fs;
        // Initialize DotEnvSource for resolving env. secrets
        this.dotEnvSource = new DotEnvSource({
            loadLocal: true,
            fs: this.fs,
            projectRoot: this.projectRoot
        });
    }

    private async getPath(scope: 'global' | 'project', name: string): Promise<string> {
        const root = scope === 'global' ? this.globalRoot : this.projectRoot;
        return await this.fs.join(root, this.environmentsDir, `${name}.rd`);
    }

    /**
     * Load an environment profile by name.
     * @param name - Environment name (without .rd extension)
     * @param scope - Optional scope. If omitted, checks Project then Global.
     */
    async load(name: string, scope?: 'global' | 'project'): Promise<EnvironmentProfile> {
        let filePath: string;

        if (scope) {
            filePath = await this.getPath(scope, name);
        } else {
            // Auto-resolution: Project > Global
            const projectPath = await this.getPath('project', name);
            if (await this.fs.exists(projectPath)) {
                filePath = projectPath;
            } else {
                filePath = await this.getPath('global', name);
            }
        }

        try {
            const content = await this.fs.readTextFile(filePath);
            const data = yaml.load(content) as any;

            if (data.meta && data.meta.version >= 2) {
                // V2: Already structured
                this.profile = data as EnvironmentProfile;
            } else {
                // V1: Normalize to V2
                const v1 = data as { name: string; variables: Record<string, string>; secrets?: string[] };
                const secrets = new Set(v1.secrets || []);

                this.profile = {
                    meta: {
                        version: 2,
                        name: v1.name || name,
                        description: "Imported V1 Profile"
                    },
                    variables: {}
                };

                // Convert V1 KV to V2 VariableDefinitions
                for (const [key, value] of Object.entries(v1.variables || {})) {
                    this.profile.variables[key] = {
                        value: String(value), // Ensure string
                        type: 'string',
                        sensitive: secrets.has(key),
                        enabled: true
                    };
                }
            }

            // Cache secret values for masking (Revised for V2)
            this.secretValues.clear();
            for (const [key, def] of Object.entries(this.profile.variables)) {
                if (def.sensitive) {
                    let value = def.value;

                    if (value.startsWith('env.')) {
                        const envKey = value.slice(4);
                        value = (await this.dotEnvSource.get(envKey)) || '';
                    }

                    if (value && value.length > 0) {
                        this.secretValues.add(value);
                    }
                }
            }

            return this.profile;
        } catch (error) {
            // We rely on the adapter to throw standard errors or we catch generic
            throw new Error(`Environment not found: ${name} (checked path: ${filePath})`);
        }
    }

    /**
     * Save an environment profile to disk.
     * Always saves in V2 format.
     * @param profile 
     * @param scope Defaults to 'global' if not specified, but UI should always specify.
     */
    async save(profile: EnvironmentProfile, scope: 'global' | 'project'): Promise<void> {
        const filePath = await this.getPath(scope, profile.meta.name);

        // Ensure directory exists (basic check, rely on fs adapter/consumer to ensure dir usually)
        // Note: fs.writeTextFile usually doesn't create dirs. 
        // The consumer (Store) handles mkdir, but ideally Manager should.
        // For now, keeping existing contract where Store handles mkdir if needed, 
        // or we can add minimal verification here if FS supports it.

        // Serialize to YAML
        const content = yaml.dump(profile);
        await this.fs.writeTextFile(filePath, content);

        // Update current profile if names match
        if (this.profile && this.profile.meta.name === profile.meta.name) {
            this.profile = profile;
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
        if (!this.profile) {
            return false;
        }
        const def = this.profile.variables[name];
        return def?.sensitive ?? false;
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
     * List available environment profiles from both scopes.
     */
    async listProfiles(): Promise<{ global: string[]; project: string[] }> {
        const listDir = async (root: string): Promise<string[]> => {
            if (!root) return []; // Safety for empty projectRoot
            const dirPath = await this.fs.join(root, this.environmentsDir);
            try {
                // Check existance first to avoid throwing
                if (!await this.fs.exists(dirPath)) return [];

                const entries = await this.fs.readDir(dirPath);
                return entries
                    .filter(e => e.isFile && e.name.endsWith('.rd'))
                    .map(e => e.name.replace('.rd', ''))
                    .sort();
            } catch {
                return [];
            }
        };

        const [global, project] = await Promise.all([
            listDir(this.globalRoot),
            listDir(this.projectRoot)
        ]);

        return { global, project };
    }
}

