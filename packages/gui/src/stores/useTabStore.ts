import { create } from 'zustand';

export interface Tab {
    id: string;
    name: string;
    type: 'request' | 'collection' | 'environment';
    path?: string;
    isDirty?: boolean;
    /** Arbitrary metadata (e.g. environment scope) */
    data?: Record<string, unknown>;
}

interface TabState {
    tabs: Tab[];
    activeTabId: string | null;
    addTab: (tab: Omit<Tab, 'id'> & { id?: string }) => string;
    closeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    updateTab: (id: string, updates: Partial<Tab>) => void;
    markDirty: (id: string, isDirty: boolean) => void;
    closeFolderTabs: (folderPath: string) => void;
    renameFolderTabs: (oldPrefix: string, newPrefix: string) => void;
}

export const useTabStore = create<TabState>((set, get) => ({
    tabs: [],
    activeTabId: null,

    addTab: (tabData) => {
        const { tabs, setActiveTab } = get();

        // If ID is provided, check if it exists
        if (tabData.id && tabs.some(t => t.id === tabData.id)) {
            setActiveTab(tabData.id);
            return tabData.id;
        }

        const id = tabData.id || Math.random().toString(36).substring(7);
        const newTab: Tab = { ...tabData, id };

        set((state) => ({
            tabs: [...state.tabs, newTab],
            activeTabId: id,
        }));
        return id;
    },

    closeTab: (id) => {
        // Clean up in-memory request data so stale edits don't survive
        // (lazy import avoids circular dependency)
        import('./requestStore').then(({ useRequestStore }) => {
            useRequestStore.getState().removeRequest(id);
        });

        set((state) => {
            const newTabs = state.tabs.filter((t) => t.id !== id);
            // Determine new active tab if we closed the active one
            let newActiveId = state.activeTabId;
            if (state.activeTabId === id) {
                newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
            }
            return { tabs: newTabs, activeTabId: newActiveId };
        });
    },

    setActiveTab: (id) => set({ activeTabId: id }),

    updateTab: (id, updates) =>
        set((state) => {
            // If ID is changing, we also need to update activeTabId if it matches
            const newActiveId = (updates.id && state.activeTabId === id) ? updates.id : state.activeTabId;

            return {
                activeTabId: newActiveId,
                tabs: state.tabs.map(t => t.id === id ? { ...t, ...updates } : t)
            };
        }),

    markDirty: (id, isDirty) =>
        set((state) => ({
            tabs: state.tabs.map(t => t.id === id ? { ...t, isDirty } : t)
        })),

    closeFolderTabs: (folderPath) => {
        set((state) => {
            // Close all tabs that start with the folder path
            const newTabs = state.tabs.filter((t) => !t.path?.startsWith(folderPath));

            // If active tab was inside, find new active
            let newActiveId = state.activeTabId;
            const activeTab = state.tabs.find(t => t.id === state.activeTabId);

            if (activeTab && activeTab.path?.startsWith(folderPath)) {
                newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
            } else if (state.activeTabId && !newTabs.find(t => t.id === state.activeTabId)) {
                // Safety: if active ID is not in new tabs
                newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
            }

            return { tabs: newTabs, activeTabId: newActiveId };
        });
    },

    renameFolderTabs: (oldPrefix, newPrefix) =>
        set((state) => {
            let newActiveId = state.activeTabId;

            const newTabs = state.tabs.map(t => {
                if (t.path?.startsWith(oldPrefix)) {
                    // Replace prefix
                    const relative = t.path.substring(oldPrefix.length);
                    const newPath = newPrefix + relative;

                    // Since ID is often the path, we might need to update ID too if they match
                    // But in our system ID = Path usually.
                    const newId = (t.id === t.path) ? newPath : t.id;

                    if (state.activeTabId === t.id) {
                        newActiveId = newId;
                    }

                    return {
                        ...t,
                        id: newId,
                        path: newPath
                    };
                }
                return t;
            });

            return {
                tabs: newTabs,
                activeTabId: newActiveId
            };
        }),
}));
