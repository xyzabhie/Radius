import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { open } from '@tauri-apps/plugin-dialog';
import { readDir, writeTextFile, mkdir, remove, rename, readTextFile, exists } from '@tauri-apps/plugin-fs';
import { join, dirname } from '@tauri-apps/api/path';
import yaml from 'js-yaml';
import { RequestData } from '../components/request/types';
import { toast } from 'sonner';

// Concurrency guard: prevents double-click / race-condition file ops
const _pendingOps = new Set<string>();

export interface FileNode {
    id: string; // Absolute Path
    name: string;
    type: 'file' | 'directory';
    children?: FileNode[];
    isOpen?: boolean; // For folders
}

interface CollectionState {
    roots: string[]; // Paths to open collections
    fileTree: Record<string, FileNode[]>; // Root Path -> Nodes
    openFolders: Set<string>; // Tracks expanded folder paths
    isLoading: boolean;

    // Actions
    addCollection: () => Promise<void>;
    createCollection: (name: string) => Promise<void>;
    removeCollection: (path: string) => void;
    loadCollection: (path: string) => Promise<void>;
    toggleFolder: (path: string) => void;

    // Request Operations
    saveRequest: (path: string, request: RequestData) => Promise<void>;
    createRequest: (folderPath: string, name: string) => Promise<string>;
    createFolder: (parentPath: string, name: string) => Promise<void>;
    deleteItem: (path: string) => Promise<void>;
    renameItem: (oldPath: string, newPath: string) => Promise<void>;
    duplicateRequest: (path: string) => Promise<void>;
    loadRequest: (path: string) => Promise<Partial<RequestData>>;
    importPostmanCollection: () => Promise<void>;
}

export const useCollectionStore = create<CollectionState>()(
    persist(
        (set, get) => ({
            roots: [],
            fileTree: {},
            openFolders: new Set<string>(),
            isLoading: false,

            addCollection: async () => {
                try {
                    const selected = await open({
                        directory: true,
                        multiple: false,
                    });

                    if (selected && typeof selected === 'string') {
                        const { roots, loadCollection } = get();
                        if (!roots.includes(selected)) {
                            set({ roots: [...roots, selected] });
                            await loadCollection(selected);
                        }
                    }
                } catch (err) {
                    console.error('Failed to open collection:', err);
                    toast.error("Failed to open collection. (Did you restart the app?)");
                }
            },

            createCollection: async (name: string) => {
                try {
                    const { roots, loadCollection } = get();

                    // Open folder picker so the user can choose where to create
                    const selected = await open({
                        directory: true,
                        multiple: false,
                        title: `Choose location for "${name}" collection`,
                    });

                    if (!selected || typeof selected !== 'string') {
                        // User cancelled the dialog
                        return;
                    }

                    const newCollectionPath = await join(selected, name);

                    // Create directory
                    await mkdir(newCollectionPath);

                    // Add to roots
                    if (!roots.includes(newCollectionPath)) {
                        set({ roots: [...roots, newCollectionPath] });
                        await loadCollection(newCollectionPath);
                    }
                    toast.success("Collection created");
                } catch (err) {
                    console.error('Failed to create collection:', err);
                    toast.error("Failed to create collection");
                    throw err;
                }
            },

            removeCollection: (path: string) => {
                set((state) => {
                    const newFileTree = { ...state.fileTree };
                    delete newFileTree[path];
                    return {
                        roots: state.roots.filter(r => r !== path),
                        fileTree: newFileTree,
                    };
                });
            },

            loadCollection: async (rootPath) => {
                set({ isLoading: true });
                try {
                    const entries = await readRecursive(rootPath);
                    set((state) => ({
                        fileTree: {
                            ...state.fileTree,
                            [rootPath]: entries
                        },
                        isLoading: false
                    }));
                } catch (err) {
                    console.error('Failed to load collection:', err);
                    set({ isLoading: false });
                }
            },

            toggleFolder: (path) => {
                set((state) => {
                    const newOpen = new Set(state.openFolders);
                    if (newOpen.has(path)) {
                        newOpen.delete(path);
                    } else {
                        newOpen.add(path);
                    }
                    return { openFolders: newOpen };
                });
            },

            loadRequest: async (path: string) => {
                try {
                    const content = await readTextFile(path);
                    const data = yaml.load(content) as any;

                    if (!data || !data.request) {
                        throw new Error("Invalid request file");
                    }

                    const req = data.request;
                    // Removed unused meta
                    const auth = data.auth || req.auth || { type: 'none' };

                    // Map V2 KeyValueEntry[] to GUI KeyValueItem[]
                    const mapToGuiItems = (entries: any[] | undefined): import('../components/request/types').KeyValueItem[] => {
                        if (!entries || !Array.isArray(entries)) return [];
                        return entries.map(e => ({
                            id: crypto.randomUUID(),
                            key: e.key,
                            value: e.value,
                            description: e.description,
                            enabled: e.enabled !== false
                        }));
                    };

                    const headers = mapToGuiItems(req.headers);
                    const params = mapToGuiItems(req.params);

                    // Body Mapping (V2 only)
                    let bodyType: RequestData['bodyType'] = 'none';
                    let bodyContent = '';
                    let formData: import('../components/request/types').KeyValueItem[] = [];
                    let urlEncoded: import('../components/request/types').KeyValueItem[] = [];
                    let binaryFilePath = '';

                    if (req.body && req.body.type) {
                        bodyType = req.body.type;
                        bodyContent = req.body.text || '';
                        if (Array.isArray(req.body.form)) {
                            const formItems = req.body.form.map((f: any) => ({
                                id: crypto.randomUUID(),
                                key: f.key,
                                value: f.value,
                                description: f.description,
                                enabled: f.enabled !== false
                            }));
                            if (bodyType === 'form-data') formData = formItems;
                            if (bodyType === 'urlencoded') urlEncoded = formItems;
                        }
                        if (bodyType === 'binary' && req.body.fileName) {
                            binaryFilePath = req.body.fileName;
                        }
                    }

                    return {
                        method: req.method,
                        url: req.url,
                        headers,
                        params,
                        auth: {
                            type: auth.type || 'none',
                            token: auth.token,
                            username: auth.username,
                            password: auth.password,
                            key: auth.key,
                            value: auth.value,
                            in: auth.in,
                            enabled: auth.enabled !== false
                        },
                        body: bodyContent,
                        bodyType,
                        formData,
                        urlEncoded,
                        binaryFilePath,
                        preRequestScript: req.preRequestScript,
                        testScript: req.testScript
                    };

                } catch (err) {
                    console.error('Failed to load request:', err);
                    toast.error("Failed to load request file");
                    throw err;
                }
            },

            saveRequest: async (path, request) => {
                try {
                    // Map GUI items to V2 KeyValueEntry
                    const mapToSchema = (items: import('../components/request/types').KeyValueItem[]) => {
                        return items.map(i => ({
                            key: i.key,
                            value: i.value,
                            description: i.description,
                            enabled: i.enabled
                        }));
                    };

                    // Map Body to V2 RequestBody
                    const mapBody = (): any => {
                        if (request.bodyType === 'none') return undefined;

                        const base: any = { type: request.bodyType };

                        if (['json', 'xml', 'html', 'text'].includes(request.bodyType)) {
                            base.text = request.body;
                        }
                        else if (request.bodyType === 'graphql') {
                            base.type = 'graphql';
                            // Simple parsing guess
                            try {
                                const parsed = JSON.parse(request.body);
                                base.graphql = {
                                    query: parsed.query,
                                    variables: JSON.stringify(parsed.variables)
                                };
                            } catch {
                                base.text = request.body; // Fallback to raw text if not valid JSON structure logic
                            }
                        }
                        else if (request.bodyType === 'form-data') {
                            base.form = mapToSchema(request.formData);
                        }
                        else if (request.bodyType === 'urlencoded') {
                            base.form = mapToSchema(request.urlEncoded);
                        }
                        else if (request.bodyType === 'binary' && request.binaryFilePath) {
                            base.fileName = request.binaryFilePath;
                        }

                        return base;
                    };

                    const persistentData = {
                        meta: {
                            name: (path.split(/[\\/]/).pop()?.replace('.rd', '') || 'Untitled'),
                            type: 'REST',
                            version: 2
                        },
                        request: {
                            method: request.method,
                            url: request.url,
                            headers: mapToSchema(request.headers),
                            params: mapToSchema(request.params),
                            body: mapBody(),
                            auth: request.auth,
                            preRequestScript: request.preRequestScript,
                            testScript: request.testScript,
                            binaryFilePath: request.binaryFilePath
                        }
                    };

                    const content = yaml.dump(persistentData);
                    await writeTextFile(path, content);

                    // Reload the root collection that contains this file
                    const { roots, loadCollection } = get();
                    for (const root of roots) {
                        if (path.startsWith(root)) {
                            await loadCollection(root);
                            break;
                        }
                    }

                } catch (err) {
                    console.error('Failed to save request:', err);
                    throw err;
                }
            },

            createRequest: async (folderPath, name) => {
                const opKey = `create:${folderPath}/${name}`;
                if (_pendingOps.has(opKey)) return '';
                _pendingOps.add(opKey);
                try {
                    const filename = name.endsWith('.rd') ? name : `${name}.rd`;
                    const fullPath = await join(folderPath, filename);

                    // Guard: prevent overwriting existing files
                    if (await exists(fullPath)) {
                        toast.error(`A request named "${name}" already exists in this folder.`);
                        throw new Error(`File already exists: ${fullPath}`);
                    }

                    // V2 Schema: { meta, request }
                    const v2Request = {
                        meta: {
                            name: name.replace(/\.rd$/, ''),
                            type: 'REST',
                            version: 2
                        },
                        request: {
                            method: 'GET',
                            url: '',
                            headers: [],
                            params: [],
                            body: undefined
                        }
                    };

                    const content = yaml.dump(v2Request);
                    await writeTextFile(fullPath, content);

                    // Refresh actions
                    const { roots, loadCollection } = get();
                    for (const root of roots) {
                        if (folderPath.startsWith(root)) {
                            await loadCollection(root);
                            break;
                        }
                    }

                    toast.success("Request created");
                    return fullPath;
                } catch (err) {
                    console.error('Failed to create request:', err);
                    toast.error("Failed to create request");
                    throw err;
                } finally {
                    _pendingOps.delete(opKey);
                }
            },

            duplicateRequest: async (path: string) => {
                if (_pendingOps.has(`dup:${path}`)) return;
                _pendingOps.add(`dup:${path}`);
                try {
                    const content = await readTextFile(path);
                    const parentPath = await dirname(path);

                    // Generate unique copy name with counter
                    let counter = 1;
                    let newPath = path.replace('.rd', ' copy.rd');
                    while (await exists(newPath)) {
                        counter++;
                        newPath = path.replace('.rd', ` copy ${counter}.rd`);
                    }

                    // Update the name in the duplicated content
                    try {
                        const parsed = yaml.load(content) as any;
                        if (parsed?.meta?.name) {
                            const baseName = parsed.meta.name;
                            parsed.meta.name = counter > 1 ? `${baseName} copy ${counter}` : `${baseName} copy`;
                        }
                        await writeTextFile(newPath, yaml.dump(parsed));
                    } catch {
                        // Fallback: write original content if YAML parsing fails
                        await writeTextFile(newPath, content);
                    }

                    // Refresh parent collection
                    const { roots, loadCollection } = get();
                    for (const root of roots) {
                        if (parentPath.startsWith(root)) {
                            await loadCollection(root);
                            break;
                        }
                    }
                    toast.success("Request duplicated");
                } catch (err) {
                    console.error('Failed to duplicate request:', err);
                    toast.error("Failed to duplicate request");
                    throw err;
                } finally {
                    _pendingOps.delete(`dup:${path}`);
                }
            },

            createFolder: async (parentPath, name) => {
                const opKey = `mkdir:${parentPath}/${name}`;
                if (_pendingOps.has(opKey)) return;
                _pendingOps.add(opKey);
                try {
                    const fullPath = await join(parentPath, name);
                    await mkdir(fullPath);

                    // Refresh actions
                    const { roots, loadCollection } = get();
                    for (const root of roots) {
                        if (parentPath.startsWith(root)) {
                            await loadCollection(root);
                            break;
                        }
                    }
                    toast.success("Folder created");
                } catch (err) {
                    console.error('Failed to create folder:', err);
                    toast.error("Failed to create folder");
                    throw err;
                } finally {
                    _pendingOps.delete(opKey);
                }
            },

            deleteItem: async (path) => {
                if (_pendingOps.has(`del:${path}`)) return;
                _pendingOps.add(`del:${path}`);
                try {
                    await remove(path, { recursive: true });

                    // Refresh collections
                    const { roots, loadCollection } = get();
                    for (const root of roots) {
                        if (path.startsWith(root)) {
                            await loadCollection(root);
                            break;
                        }
                    }
                    toast.success("Item deleted");
                } catch (err) {
                    console.error('Failed to delete item:', err);
                    toast.error("Failed to delete item");
                    throw err;
                } finally {
                    _pendingOps.delete(`del:${path}`);
                }
            },

            renameItem: async (oldPath: string, newPath: string) => {
                try {
                    await rename(oldPath, newPath);

                    // Refresh collections
                    const { roots, loadCollection } = get();
                    for (const root of roots) {
                        if (oldPath.startsWith(root)) {
                            await loadCollection(root);
                            break;
                        }
                    }
                    toast.success("Item renamed");
                } catch (err) {
                    console.error('Failed to rename item:', err);
                    toast.error("Failed to rename item");
                    throw err;
                }
            },

            importPostmanCollection: async () => {
                try {
                    // 1. SELECT POSTMAN JSON
                    const selectedFile = await open({
                        filters: [{ name: 'Postman Collection', extensions: ['json'] }],
                        multiple: false,
                    });
                    if (!selectedFile || typeof selectedFile !== 'string') return;

                    // 2. CHOOSE TARGET DIRECTORY
                    const targetDir = await open({
                        directory: true,
                        multiple: false,
                        title: 'Select Destination Folder'
                    });
                    if (!targetDir || typeof targetDir !== 'string') return;

                    const content = await readTextFile(selectedFile);
                    const collection = JSON.parse(content);

                    if (!collection.item || !Array.isArray(collection.item)) {
                        toast.error("Invalid Postman collection format");
                        return;
                    }

                    toast.loading("Importing collection...", { id: 'import-postman' });

                    // RECURSIVE MAPPER
                    const processItem = async (item: any, currentPath: string, parentAuth?: any, parentScripts?: { preRequest: string, test: string }) => {
                        const itemName = (item.name || 'Untitled').replace(/[\\/:*?"<>|]/g, '_');
                        const fullPath = await join(currentPath, itemName);

                        // Extract inherited scripts/auth from current level
                        const currentScripts = extractPostmanScripts(item);
                        const mergedScripts = {
                            preRequest: (parentScripts?.preRequest ? parentScripts.preRequest + '\n' : '') + currentScripts.preRequest,
                            test: (parentScripts?.test ? parentScripts.test + '\n' : '') + currentScripts.test
                        };
                        const currentAuth = item.auth || parentAuth;

                        if (item.item && Array.isArray(item.item)) {
                            // FOLDER
                            if (!(await exists(fullPath))) {
                                await mkdir(fullPath);
                            }
                            for (const subItem of item.item) {
                                await processItem(subItem, fullPath, currentAuth, mergedScripts);
                            }
                        } else if (item.request) {
                            // REQUEST
                            const rdPath = `${fullPath}.rd`;
                            const radiusRequest = mapPostmanToRadius(item, currentAuth, mergedScripts);
                            await writeTextFile(rdPath, yaml.dump(radiusRequest));
                        }
                    };

                    // START RECURSION
                    const collectionName = (collection.info?.name || 'Imported Collection').replace(/[\\/:*?"<>|]/g, '_');
                    const rootImportPath = await join(targetDir, collectionName);

                    if (!(await exists(rootImportPath))) {
                        await mkdir(rootImportPath);
                    }

                    // Collection-level scripts/auth
                    const colScripts = extractPostmanScripts(collection);
                    const colAuth = collection.auth;

                    for (const item of collection.item) {
                        await processItem(item, rootImportPath, colAuth, colScripts);
                    }

                    // 3. REFRESH
                    const { roots, loadCollection } = get();
                    let updatedRoots = [...roots];

                    // Add to roots if it's a new top-level collection folder
                    if (!roots.includes(rootImportPath)) {
                        updatedRoots.push(rootImportPath);
                    }

                    set({ roots: updatedRoots });
                    await loadCollection(rootImportPath);

                    toast.success(`Successfully imported "${collectionName}"`, { id: 'import-postman' });

                } catch (err) {
                    console.error('Postman import failed:', err);
                    toast.error("Import failed: " + (err as Error).message, { id: 'import-postman' });
                }
            }
        }),
        {
            name: 'collection-storage',
            partialize: (state) => ({ roots: state.roots }),
            onRehydrateStorage: () => (state) => {
                // After rehydration, auto-load file trees for all persisted roots
                if (state && state.roots.length > 0) {
                    // Small delay to ensure Tauri APIs are ready
                    setTimeout(() => {
                        for (const root of state.roots) {
                            state.loadCollection(root).catch((err: unknown) => {
                                console.warn(`[Collections] Failed to reload ${root}:`, err);
                            });
                        }
                    }, 100);
                }
            },
        }
    )
);

/** Directories to exclude from the file tree (managed by other systems) */
const EXCLUDED_DIRS = new Set(['environments', 'node_modules', '.git']);

// Helper to recursively read directory
async function readRecursive(path: string): Promise<FileNode[]> {
    const entries = await readDir(path);
    const nodes: FileNode[] = [];

    for (const entry of entries) {
        // Filter: Only Folders or .rd files
        const isRd = entry.isFile && entry.name.endsWith('.rd');
        const isDir = entry.isDirectory;

        if (!isRd && !isDir) continue;
        if (entry.name.startsWith('.')) continue; // Skip hidden/git
        if (isDir && EXCLUDED_DIRS.has(entry.name)) continue; // Skip managed dirs

        const fullPath = await join(path, entry.name);

        const node: FileNode = {
            id: fullPath,
            name: entry.name,
            type: isDir ? 'directory' : 'file',
            children: isDir ? await readRecursive(fullPath) : undefined
        };
        nodes.push(node);
    }

    // Sort: Folders first, then files
    return nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
    });
}

// --- POSTMAN IMPORT HELPERS ---

function extractPostmanScripts(item: any) {
    let preRequest = '';
    let test = '';
    const events = item.event || [];
    for (const event of events) {
        const scriptLines = event.script?.exec;
        if (!scriptLines) continue;
        const scriptContent = Array.isArray(scriptLines) ? scriptLines.join('\n') : scriptLines;
        const bridgedScript = bridgePostmanScript(scriptContent);
        if (event.listen === 'prerequest') preRequest = bridgedScript;
        else if (event.listen === 'test') test = bridgedScript;
    }
    return { preRequest, test };
}

function mapPostmanToRadius(postmanItem: any, inheritedAuth?: any, inheritedScripts?: { preRequest: string, test: string }): any {
    const req = postmanItem.request;
    if (!req) return null;

    // 1. URL Mapping
    let url = '';
    if (typeof req.url === 'string') {
        url = req.url;
    } else if (req.url) {
        if (req.url.raw) {
            url = req.url.raw;
        } else if (Array.isArray(req.url.host) && Array.isArray(req.url.path)) {
            // Reconstruct: protocol://host/path
            const protocol = req.url.protocol ? `${req.url.protocol}://` : '';
            const host = req.url.host.join('.');
            const path = req.url.path.join('/');
            url = `${protocol}${host}/${path}`;
        }
    }

    // 2. Headers
    const headers = (req.header || []).map((h: any) => ({
        key: h.key,
        value: h.value,
        description: h.description,
        enabled: h.disabled !== true
    }));

    // 3. Params (Query)
    const params = (req.url?.query || []).map((q: any) => ({
        key: q.key,
        value: q.value,
        description: q.description,
        enabled: q.disabled !== true
    }));

    // 4. Body
    let body: any = { type: 'none' };
    if (req.body) {
        const mode = req.body.mode;
        if (mode === 'raw') {
            const language = req.body.options?.raw?.language || 'text';
            body = {
                type: language === 'json' ? 'json' : (language === 'xml' ? 'xml' : 'text'),
                text: req.body.raw || ''
            };
        } else if (mode === 'formdata') {
            body = {
                type: 'form-data',
                form: (req.body.formdata || []).map((f: any) => ({
                    key: f.key,
                    value: f.value,
                    description: f.description,
                    enabled: f.disabled !== true
                }))
            };
        } else if (mode === 'urlencoded') {
            body = {
                type: 'urlencoded',
                form: (req.body.urlencoded || []).map((f: any) => ({
                    key: f.key,
                    value: f.value,
                    description: f.description,
                    enabled: f.disabled !== true
                }))
            };
        } else if (mode === 'urlencoded') {
            body = {
                type: 'urlencoded',
                form: (req.body.urlencoded || []).map((f: any) => ({
                    key: f.key,
                    value: f.value,
                    description: f.description,
                    enabled: f.disabled !== true
                }))
            };
        } else if (mode === 'file') {
            body = {
                type: 'binary',
                fileName: req.body.file?.src || ''
            };
        } else if (mode === 'graphql') {
            body = {
                type: 'graphql',
                text: JSON.stringify({
                    query: req.body.graphql?.query || '',
                    variables: req.body.graphql?.variables || '{}'
                })
            };
        }
    }

    // 5. Auth Mapping (with inheritance support)
    let auth: any = { type: 'none' };
    const pmAuth = req.auth || inheritedAuth;
    if (pmAuth) {
        if (pmAuth.type === 'bearer') {
            const tokenValue = pmAuth.bearer?.find((f: any) => f.key === 'token')?.value || pmAuth.bearer?.[0]?.value || '';
            auth = {
                type: 'bearer',
                token: tokenValue,
                enabled: true
            };
        } else if (pmAuth.type === 'basic') {
            auth = {
                type: 'basic',
                username: pmAuth.basic?.find((f: any) => f.key === 'username')?.value || '',
                password: pmAuth.basic?.find((f: any) => f.key === 'password')?.value || '',
                enabled: true
            };
        } else if (pmAuth.type === 'apikey') {
            auth = {
                type: 'apikey',
                key: pmAuth.apikey?.find((f: any) => f.key === 'key')?.value || '',
                value: pmAuth.apikey?.find((f: any) => f.key === 'value')?.value || '',
                in: pmAuth.apikey?.find((f: any) => f.key === 'in')?.value || 'header',
                enabled: true
            };
        }
    }

    // 6. Scripts (merging inherited folder scripts)
    const localScripts = extractPostmanScripts(postmanItem);
    const preRequestScript = (inheritedScripts?.preRequest ? inheritedScripts.preRequest + '\n' : '') + localScripts.preRequest;
    const testScript = (inheritedScripts?.test ? inheritedScripts.test + '\n' : '') + localScripts.test;

    return {
        meta: {
            name: postmanItem.name || 'Untitled',
            description: req.description || postmanItem.description || '',
            type: 'REST',
            version: 2
        },
        request: {
            method: req.method || 'GET',
            url,
            headers,
            params,
            body,
            auth,
            preRequestScript: preRequestScript.trim(),
            testScript: testScript.trim()
        }
    };
}

/**
 * Attempts to bridge Postman API calls to Radius 'rd' API calls
 * Note: This is a best-effort conversion for simple cases.
 */
function bridgePostmanScript(script: string): string {
    if (!script) return '';

    return script
        // postman.setEnvironmentVariable -> rd.variables.set
        .replace(/postman\.setEnvironmentVariable\(/g, 'rd.variables.set(')
        .replace(/pm\.environment\.set\(/g, 'rd.variables.set(')
        // pm.environment.get -> rd.variables.get
        .replace(/pm\.environment\.get\(/g, 'rd.variables.get(')
        // pm.response.json() -> rd.response.json
        .replace(/pm\.response\.json\(\)/g, '(rd.response.json || {})')
        .replace(/pm\.response\.text\(\)/g, 'rd.response.body')
        // postman.setGlobalVariable -> rd.variables.set
        .replace(/postman\.setGlobalVariable\(/g, 'rd.variables.set(')
        .replace(/pm\.globals\.set\(([^,]+),\s*([^)]+)\)/g, 'rd.variables.set($1, $2)')
        // pm.test -> rd.test
        .replace(/pm\.test\(([^,]+),\s*(?:function\s*\(\)\s*\{|\(\)\s*=>\s*\{)/g, 'rd.test($1, () => {')
        // pm.expect(...) -> rd.expect(...)
        .replace(/pm\.expect\(/g, 'rd.expect(')
        // Assertions
        .replace(/\.to\.have\.status\((\d+)\)/g, '.toBe($1)')
        // Legacy Postman globals - Smart mapping for JSON parsing
        .replace(/JSON\.parse\(\s*responseBody\s*\)/g, '(rd.response.json || {})')
        .replace(/\bresponseBody\b/g, 'rd.response.body')
        .replace(/\bresponseCode\.code\b/g, 'rd.response.status')
        .replace(/\btests\[([^\]]+)\]\s*=\s*/g, 'rd.test($1, () => { rd.expect(true).toBe(')
        // Variable syntax conversion {{var}} in scripts
        .replace(/{{([^}]+)}}/g, 'rd.variables.get("$1")');
}
