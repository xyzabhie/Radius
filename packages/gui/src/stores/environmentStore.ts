import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { readDir, mkdir, remove, readTextFile, rename as fsRename } from '@tauri-apps/plugin-fs';
import { join, appConfigDir } from '@tauri-apps/api/path';
import { useCollectionStore } from './useCollectionStore';
import { EnvironmentManager } from '@radius/core/environment';
import { TauriFileSystem } from '../lib/adapters/TauriFileSystem';
import type { EnvironmentProfile } from '@radius/core/environment';
import { toast } from 'sonner';

interface EnvironmentStore {
    // Hybrid State: Separate lists for Global and Project
    environments: {
        global: string[];
        project: string[];
    };
    activeEnvironment: { name: string; scope: 'global' | 'project' } | null;
    activeVariables: Record<string, string>; // Flattened KV map
    isLoading: boolean;

    // Core Engine Instance
    envManager: EnvironmentManager | null;

    // Actions
    initManager: () => Promise<EnvironmentManager>;
    loadEnvironments: () => Promise<void>;
    createEnvironment: (name: string, scope: 'global' | 'project') => Promise<void>;
    deleteEnvironment: (name: string, scope: 'global' | 'project') => Promise<void>;
    renameEnvironment: (oldName: string, newName: string, scope: 'global' | 'project') => Promise<void>;
    setActiveEnvironment: (env: { name: string; scope: 'global' | 'project' } | null) => Promise<void>;

    // File Operations for Editor
    getEnvironmentContent: (name: string, scope: 'global' | 'project') => Promise<string>;
    saveEnvironment: (profile: EnvironmentProfile, scope: 'global' | 'project') => Promise<void>;

    setVariables: (variables: Record<string, string>) => void;

    // Internal
    _lastProjectRoot: string;
}

export const useEnvironmentStore = create<EnvironmentStore>()(
    persist(
        (set, get) => ({
            environments: { global: [], project: [] },
            activeEnvironment: null,
            activeVariables: {},
            isLoading: false,
            envManager: null,
            _lastProjectRoot: '',

            setVariables: (variables) => set({ activeVariables: variables }),

            initManager: async () => {
                const { roots } = useCollectionStore.getState();
                let projectRoot = roots[0] || ''; // Allow empty project root (Global only mode)

                const current = get().envManager;
                if (current && get()._lastProjectRoot === projectRoot) return current;

                const fs = new TauriFileSystem();

                // key change: Resolve AppData/Config dir for Global Storage
                const globalRoot = await appConfigDir();

                // Ensure global environments dir exists
                try {
                    const globalEnvDir = await join(globalRoot, 'environments');
                    try { await readDir(globalEnvDir); } catch {
                        await mkdir(globalEnvDir, { recursive: true });
                    }
                } catch (e) {
                    console.warn("Could not bootstrap global env dir", e);
                }

                const manager = new EnvironmentManager({
                    projectRoot: projectRoot,
                    globalRoot: globalRoot,
                    fs: fs,
                    environmentsDir: 'environments'
                });

                set({ envManager: manager, _lastProjectRoot: projectRoot });
                return manager;
            },

            loadEnvironments: async () => {
                try {
                    const manager = await get().initManager();
                    const envs = await manager.listProfiles();
                    set({ environments: envs });
                } catch (err) {
                    console.error("Failed to list environments", err);
                    set({ environments: { global: [], project: [] } });
                }
            },

            createEnvironment: async (name, scope) => {
                try {
                    const manager = await get().initManager();

                    // Initialize clean V2 profile
                    const profile: EnvironmentProfile = {
                        meta: {
                            version: 2,
                            name: name,
                            description: scope === 'global' ? "Global Environment" : "Project Environment"
                        },
                        variables: {
                            API_URL: { value: "https://api.example.com", type: 'string', enabled: true }
                        }
                    };

                    // Ensure directory exists
                    // We must determine the correct root path to mkdir
                    let targetRoot;
                    if (scope === 'global') {
                        targetRoot = await appConfigDir();
                    } else {
                        targetRoot = useCollectionStore.getState().roots[0];
                        if (!targetRoot) throw new Error("No project open for Project Scope");
                    }

                    const envDir = await join(targetRoot, 'environments');
                    try {
                        await readDir(envDir);
                    } catch {
                        await mkdir(envDir, { recursive: true });
                    }

                    await manager.save(profile, scope);
                    await get().loadEnvironments();
                    toast.success(`Environment "${name}" created`);
                } catch (e) {
                    console.error("[EnvStore] Failed to create environment:", e);
                    toast.error("Failed to create environment");
                    throw e;
                }
            },

            deleteEnvironment: async (name, scope) => {
                // Construct path manually to remove the file.
                // TODO: extend Manager with a delete() method later.

                let targetRoot;
                if (scope === 'global') {
                    targetRoot = await appConfigDir();
                } else {
                    targetRoot = useCollectionStore.getState().roots[0];
                }

                if (!targetRoot) return;

                const fileName = name.endsWith('.rd') ? name : `${name}.rd`;
                const filePath = await join(targetRoot, 'environments', fileName);

                try {
                    await remove(filePath);

                    const current = get().activeEnvironment;
                    if (current && current.name === name && current.scope === scope) {
                        set({ activeEnvironment: null, activeVariables: {} });
                    }

                    await get().loadEnvironments();
                    toast.success("Environment deleted");
                } catch (e) {
                    console.error("Failed to delete environment", e);
                    toast.error("Failed to delete environment");
                }
            },

            renameEnvironment: async (oldName, newName, scope) => {
                let targetRoot;
                if (scope === 'global') {
                    targetRoot = await appConfigDir();
                } else {
                    targetRoot = useCollectionStore.getState().roots[0];
                }
                if (!targetRoot) return;

                const oldFile = oldName.endsWith('.rd') ? oldName : `${oldName}.rd`;
                const newFile = newName.endsWith('.rd') ? newName : `${newName}.rd`;
                const oldPath = await join(targetRoot, 'environments', oldFile);
                const newPath = await join(targetRoot, 'environments', newFile);

                // Read, update meta.name, write to new path, remove old
                try {
                    const content = await readTextFile(oldPath);
                    const updated = content.replace(
                        /^(\s*name:\s*).+$/m,
                        `$1${newName}`
                    );
                    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
                    await writeTextFile(newPath, updated);
                    await remove(oldPath);
                    toast.success("Environment renamed");
                } catch (e) {
                    // Fallback: simple rename
                    try {
                        await fsRename(oldPath, newPath);
                        toast.success("Environment renamed");
                    } catch (err) {
                        console.error("Failed to rename:", err);
                        toast.error("Failed to rename environment");
                        return;
                    }
                }

                // Update active env if it was renamed
                const current = get().activeEnvironment;
                if (current && current.name === oldName && current.scope === scope) {
                    set({ activeEnvironment: { name: newName, scope } });
                }

                await get().loadEnvironments();
            },

            setActiveEnvironment: async (env) => {
                set({ activeEnvironment: env });

                if (!env) {
                    set({ activeVariables: {} });
                    return;
                }

                try {
                    const manager = await get().initManager();
                    // Load specifically from the requested scope
                    const profile = await manager.load(env.name, env.scope);

                    // Flatten variables for Runner consumption - V2 Logic
                    const flat: Record<string, string> = {};
                    for (const [key, def] of Object.entries(profile.variables)) {
                        if (def.enabled !== false) {
                            flat[key] = def.value;
                        }
                    }

                    set({ activeVariables: flat });
                } catch (e) {
                    console.error("Failed to load env vars:", e);
                    set({ activeVariables: {} });
                }
            },

            getEnvironmentContent: async (name, scope) => {
                let targetRoot;
                if (scope === 'global') {
                    targetRoot = await appConfigDir();
                } else {
                    targetRoot = useCollectionStore.getState().roots[0];
                }

                const fileName = name.endsWith('.rd') ? name : `${name}.rd`;
                const filePath = await join(targetRoot, 'environments', fileName);

                return await readTextFile(filePath);
            },

            saveEnvironment: async (profile, scope) => {
                const manager = await get().initManager();
                await manager.save(profile, scope);

                // If this is the active environment, reload variables
                const current = get().activeEnvironment;
                if (current && current.name === profile.meta.name && current.scope === scope) {
                    await get().setActiveEnvironment(current); // Reloads and flattens
                }
            }
        }),
        {
            name: 'environment-storage',
            partialize: (state) => ({ activeEnvironment: state.activeEnvironment }),
            onRehydrateStorage: () => (state) => {
                if (state && state.activeEnvironment) {
                    // Subscribe to collection store — once roots are loaded, rehydrate env vars
                    const unsub = useCollectionStore.subscribe((collState) => {
                        if (collState.roots.length > 0 || Object.keys(collState.fileTree).length > 0) {
                            unsub();
                            state.setActiveEnvironment(state.activeEnvironment).catch((err: unknown) => {
                                console.warn('[Env] Failed to reload active env variables:', err);
                            });
                        }
                    });
                    // Fallback: if no collections, still try after a delay
                    setTimeout(() => {
                        unsub();
                        if (state.activeEnvironment) {
                            state.setActiveEnvironment(state.activeEnvironment).catch(() => { });
                        }
                    }, 2000);
                }
            },
        }
    )
);
