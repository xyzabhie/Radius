import { create } from 'zustand';
import { RequestData } from '../components/request/types';
import { ScriptRunner } from '../lib/ScriptRunner';

interface RequestState {
    requests: Record<string, RequestData>;
    initializeRequest: (tabId: string) => void;
    updateRequest: (tabId: string, data: Partial<RequestData>) => void;
    removeRequest: (tabId: string) => void;
    executeRequest: (tabId: string) => Promise<void>;
    cancelRequest: (tabId: string) => void;
}

// Keep controllers outside state to avoid non-serializable data issues
const controllers: Record<string, AbortController> = {};

export const useRequestStore = create<RequestState>((set) => ({
    // ... initial state
    requests: {},

    initializeRequest: (tabId) => set((state) => {
        if (state.requests[tabId]) return state;
        return {
            requests: {
                ...state.requests,
                [tabId]: {
                    id: tabId,
                    method: 'GET',
                    url: '',
                    auth: { type: 'none' },
                    headers: [{ id: '1', key: '', value: '', description: '', enabled: true }],
                    params: [{ id: '1', key: '', value: '', description: '', enabled: true }],
                    body: '',
                    formData: [{ id: '1', key: '', value: '', description: '', enabled: true }],
                    urlEncoded: [{ id: '1', key: '', value: '', description: '', enabled: true }],
                    bodyType: 'none'
                }
            }
        };
    }),

    updateRequest: (tabId, data) => set((state) => {
        const current = state.requests[tabId];
        if (!current) return state;
        return { requests: { ...state.requests, [tabId]: { ...current, ...data } } };
    }),

    removeRequest: (tabId) => set((state) => {
        // Cleanup controller
        if (controllers[tabId]) {
            controllers[tabId].abort();
            delete controllers[tabId];
        }
        const { [tabId]: _, ...rest } = state.requests;
        return { requests: rest };
    }),

    cancelRequest: (tabId) => {
        if (controllers[tabId]) {
            controllers[tabId].abort();
            delete controllers[tabId];

            // Update state
            set((state) => {
                const req = state.requests[tabId];
                if (!req) return state;
                return {
                    requests: { ...state.requests, [tabId]: { ...req, isLoading: false, error: "Cancelled by user" } }
                };
            });
        }
    },

    executeRequest: async (tabId) => {
        const { requests } = useRequestStore.getState();
        const requestData = requests[tabId];
        if (!requestData) return;

        // Cleanup existing controller if any
        if (controllers[tabId]) {
            controllers[tabId].abort();
        }

        // Create new controller
        const controller = new AbortController();
        controllers[tabId] = controller;

        set((state) => ({
            requests: { ...state.requests, [tabId]: { ...requestData, isLoading: true, error: null, response: null, testResults: [] } }
        }));

        try {
            // Get Environment Variables
            const { activeVariables } = await import('./environmentStore').then(m => m.useEnvironmentStore.getState());

            // 1. RUN PRE-REQUEST SCRIPT
            const scriptRunner = new ScriptRunner();
            const { updates, variableUpdates } = await scriptRunner.runPreRequest(requestData, activeVariables);

            // Apply script updates to the execution copy
            const effectiveRequestData = { ...requestData, ...updates };

            // Update variables if script modified them
            if (JSON.stringify(variableUpdates) !== JSON.stringify(activeVariables)) {
                const envStore = await import('./environmentStore').then(m => m.useEnvironmentStore.getState());
                envStore.setVariables(variableUpdates);
            }

            // Helper to map GUI items to Schema items
            const mapToSchema = (items: import('../components/request/types').KeyValueItem[]): import('@radius/core').KeyValueEntry[] => {
                return items.map(i => ({
                    key: i.key,
                    value: i.value,
                    description: i.description,
                    enabled: i.enabled
                }));
            };

            // Prepare Body (V2 Schema)
            let requestBody: import('@radius/core').RequestBody = { type: 'none' };

            if (effectiveRequestData.bodyType === 'json' || effectiveRequestData.bodyType === 'xml' || effectiveRequestData.bodyType === 'html' || effectiveRequestData.bodyType === 'text') {
                requestBody = { type: effectiveRequestData.bodyType, text: effectiveRequestData.body };
            }
            else if (effectiveRequestData.bodyType === 'form-data') {
                requestBody = { type: 'form-data', form: mapToSchema(effectiveRequestData.formData) };
            }
            else if (effectiveRequestData.bodyType === 'urlencoded') {
                requestBody = { type: 'urlencoded', form: mapToSchema(effectiveRequestData.urlEncoded) };
            }
            else if (effectiveRequestData.bodyType === 'graphql') {
                try {
                    const parsed = JSON.parse(effectiveRequestData.body);
                    requestBody = {
                        type: 'graphql',
                        graphql: {
                            query: parsed.query,
                            variables: JSON.stringify(parsed.variables)
                        }
                    };
                } catch {
                    requestBody = { type: 'graphql', text: effectiveRequestData.body };
                }
            }

            // Construct V2 Request
            const radiusRequest: import('@radius/core').RadiusRequest = {
                meta: { name: 'Temp', type: 'REST', version: 2 },
                request: {
                    method: effectiveRequestData.method as any,
                    url: effectiveRequestData.url,
                    headers: mapToSchema(effectiveRequestData.headers),
                    params: mapToSchema(effectiveRequestData.params),
                    body: requestBody,
                    auth: effectiveRequestData.auth
                }
            };

            const { roots } = await import('./useCollectionStore').then(m => m.useCollectionStore.getState());
            let projectRoot = roots.find(root => tabId.startsWith(root));
            if (!projectRoot && roots.length > 0) projectRoot = roots[0];

            // Get Environment Variables
            const { activeVariables: currentVariables } = await import('./environmentStore').then(m => m.useEnvironmentStore.getState());

            // Create Env Source
            const envSource: import('@radius/core').IVariableSource = {
                name: 'Environment',
                priority: 100,
                get: async (key: string) => currentVariables[key]
            };

            const { RequestRunner } = await import('@radius/core');
            const { TauriFileSystem } = await import('../lib/adapters/TauriFileSystem');
            const { FetchHttpClient } = await import('../lib/adapters/FetchHttpClient');

            const runner = new RequestRunner({
                projectRoot: projectRoot || '.',
                fs: new TauriFileSystem(),
                httpClient: new FetchHttpClient(),
                timeout: 30000,
                variableSources: [envSource]
            });

            const response = await runner.execute(radiusRequest, controller.signal);

            // 2. RUN POST-REQUEST SCRIPT (Tests)
            const { testResults, variableUpdates: postVariableUpdates } = await scriptRunner.runPostRequest(effectiveRequestData, response, variableUpdates);

            // Update variables if script modified them in post-request
            if (JSON.stringify(postVariableUpdates) !== JSON.stringify(variableUpdates)) {
                const envStore = await import('./environmentStore').then(m => m.useEnvironmentStore.getState());
                envStore.setVariables(postVariableUpdates);
            }

            set((state) => ({
                requests: {
                    ...state.requests,
                    [tabId]: {
                        ...state.requests[tabId],
                        isLoading: false,
                        response,
                        testResults
                    }
                }
            }));

        } catch (error) {
            // Only update if not aborted/cancelled manually (which handled state update already)
            // But checking signal.aborted is safer
            if (controller.signal.aborted) return;

            set((state) => ({
                requests: { ...state.requests, [tabId]: { ...state.requests[tabId], isLoading: false, error: (error as Error).message } }
            }));
        } finally {
            // Cleanup controller map if it matches current
            if (controllers[tabId] === controller) {
                delete controllers[tabId];
            }
        }
    }
}));
