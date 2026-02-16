/**
 * Tauri File System Adapter for Radius.
 * 
 * Implements IFileSystem using @tauri-apps/plugin-fs and @tauri-apps/api/path.
 */

import { readTextFile, writeTextFile, exists, readDir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import type { IFileSystem } from '@radius/core/types/filesystem';

export class TauriFileSystem implements IFileSystem {
    async readTextFile(filePath: string): Promise<string> {
        return readTextFile(filePath);
    }

    async writeTextFile(filePath: string, content: string): Promise<void> {
        return writeTextFile(filePath, content);
    }

    async exists(filePath: string): Promise<boolean> {
        return exists(filePath);
    }

    async readDir(dirPath: string): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>> {
        const entries = await readDir(dirPath);
        return entries.map(entry => ({
            name: entry.name,
            isFile: entry.isFile,
            isDirectory: entry.isDirectory
        }));
    }

    async join(...paths: string[]): Promise<string> {
        return join(...paths);
    }
}
