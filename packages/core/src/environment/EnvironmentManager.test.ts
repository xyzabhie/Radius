import { describe, it, expect, beforeEach } from 'vitest';
import { EnvironmentManager } from './EnvironmentManager.js';
import type { IFileSystem } from '../types/filesystem.js';

class MockFileSystem implements IFileSystem {
    private files: Map<string, string> = new Map();

    constructor(initialFiles: Record<string, string> = {}) {
        for (const [path, content] of Object.entries(initialFiles)) {
            this.files.set(path, content);
        }
    }

    async readTextFile(path: string): Promise<string> {
        if (!this.files.has(path)) {
            throw new Error(`File not found: ${path}`);
        }
        return this.files.get(path)!;
    }

    async writeTextFile(path: string, content: string): Promise<void> {
        this.files.set(path, content);
    }

    async exists(path: string): Promise<boolean> {
        return this.files.has(path);
    }

    async readDir(path: string): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>> {
        // Simple mock: find keys starting with path
        const results = new Map<string, { name: string; isFile: boolean; isDirectory: boolean }>();

        for (const filePath of this.files.keys()) {
            if (filePath.startsWith(path)) {
                const relative = filePath.substring(path.length).replace(/^[/\\]/, '');
                const segment = relative.split(/[/\\]/)[0];

                if (!results.has(segment)) {
                    const isFile = relative === segment;
                    results.set(segment, { name: segment, isFile, isDirectory: !isFile });
                }
            }
        }

        return Array.from(results.values());
    }

    async join(...paths: string[]): Promise<string> {
        return paths.join('/');
    }
}

describe('EnvironmentManager (Decoupled)', () => {
    let mockFs: MockFileSystem;

    beforeEach(() => {
        mockFs = new MockFileSystem({
            'root/environments/local.rd': `
meta:
  version: 2
  name: local
  description: Local development environment
variables:
  API_URL:
    value: "http://localhost:3000"
    type: string
    enabled: true
  API_KEY:
    value: secret-key-123
    type: string
    sensitive: true
    enabled: true
`
        });
    });

    it('should load environment from filesystem', async () => {
        const envManager = new EnvironmentManager({
            projectRoot: 'root',
            globalRoot: 'global',
            fs: mockFs
        });

        const profile = await envManager.load('local');

        expect(profile).toBeDefined();
        expect(profile.meta.name).toBe('local');
        expect(profile.variables['API_URL'].value).toBe('http://localhost:3000');
    });

    it('should mask secrets defined in the profile', async () => {
        const envManager = new EnvironmentManager({
            projectRoot: 'root',
            globalRoot: 'global',
            fs: mockFs
        });

        await envManager.load('local');

        const text = 'URL: http://localhost:3000, Key: secret-key-123';
        const masked = envManager.maskSecrets(text);

        expect(masked).toBe('URL: http://localhost:3000, Key: ********');
    });

    it('should fail cleanly if environment file is missing', async () => {
        const envManager = new EnvironmentManager({
            projectRoot: 'root',
            globalRoot: 'global',
            fs: mockFs
        });

        await expect(envManager.load('non-existent')).rejects.toThrow('Environment not found');
    });
});
