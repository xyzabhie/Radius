/**
 * Node.js File System Adapter for Radius.
 * 
 * Implements IFileSystem using 'node:fs/promises'.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { IFileSystem } from '@radius/core/types/filesystem';

export class NodeFileSystem implements IFileSystem {
    async readTextFile(filePath: string): Promise<string> {
        return fs.readFile(filePath, 'utf-8');
    }

    async writeTextFile(filePath: string, content: string): Promise<void> {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        return fs.writeFile(filePath, content, 'utf-8');
    }

    async exists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async readDir(dirPath: string): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>> {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return entries.map(entry => ({
            name: entry.name,
            isFile: entry.isFile(),
            isDirectory: entry.isDirectory()
        }));
    }

    async join(...paths: string[]): Promise<string> {
        return path.join(...paths);
    }
}
