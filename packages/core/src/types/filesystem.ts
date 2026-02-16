/**
 * Platform-agnostic file system interface.
 * 
 * This allows the Core Engine to run in environments without 'node:fs',
 * such as a Browser or Tauri Webview, by injecting a compatible adapter.
 */
export interface IFileSystem {
    /**
     * Read a file as a string.
     * @param path Absolute path to file
     */
    readTextFile(path: string): Promise<string>;

    /**
     * Write a string to a file.
     * @param path Absolute path to file
     * @param content Content to write
     */
    writeTextFile(path: string, content: string): Promise<void>;

    /**
     * Check if a path exists.
     * @param path Absolute path
     */
    exists(path: string): Promise<boolean>;

    /**
     * List files in a directory.
     * @param path Absolute path to directory
     */
    readDir(path: string): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>>;

    /**
     * Join path segments safely.
     * @param paths Path segments
     */
    join(...paths: string[]): Promise<string>;
}
