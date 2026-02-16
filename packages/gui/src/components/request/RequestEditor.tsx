import { useEffect, useCallback, useState } from "react";
import { ScriptEditor } from "./ScriptEditor";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, usePanelCallbackRef } from "react-resizable-panels";
import { AddressBar } from "./AddressBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { HeadersPanel } from "./HeadersPanel";
import { useRequestStore } from "../../stores/requestStore";
import { useTabStore } from "../../stores/useTabStore";
import { BodyEditor } from "./BodyEditor";
import { AuthPanel } from "./AuthPanel";
import { ResponseViewer } from "../response/ResponseViewer";
import { ResponseToolbar, ViewMode } from "../response/ResponseToolbar";
import { RequestData } from "./types";
import { save } from '@tauri-apps/plugin-dialog';
import { useCollectionStore } from "../../stores/useCollectionStore";
import { toast } from "sonner";
import { syncParamsFromUrl, syncUrlFromParams } from "../../lib/urlUtils";

interface RequestEditorProps {
    tabId: string;
}

const DEFAULT_PANEL_SIZE = 50;

export function RequestEditor({ tabId }: RequestEditorProps) {
    const { initializeRequest, updateRequest, executeRequest, cancelRequest, requests } = useRequestStore();
    const { markDirty, tabs, updateTab } = useTabStore();
    const { saveRequest, loadRequest } = useCollectionStore();

    const request = requests[tabId];
    const tab = tabs.find(t => t.id === tabId);

    // Response panel — imperative handle for programmatic collapse/expand
    const [responsePanelHandle, setResponsePanelHandle] = usePanelCallbackRef();
    const [isResponseMinimized, setIsResponseMinimized] = useState(false);

    // Response viewer state (lifted here so toolbar + content share it)
    const [viewMode, setViewMode] = useState<ViewMode>('pretty');
    const [lineWrap, setLineWrap] = useState(true);

    const toggleResponsePanel = useCallback(() => {
        if (!responsePanelHandle) return;
        if (isResponseMinimized) {
            responsePanelHandle.expand();
        } else {
            responsePanelHandle.collapse();
        }
    }, [responsePanelHandle, isResponseMinimized]);

    // Detect collapse/expand via onResize
    const handleResponseResize = useCallback((panelSize: { asPercentage: number; inPixels: number }) => {
        setIsResponseMinimized(panelSize.asPercentage === 0);
    }, []);

    // Copy handler — copies formatted body when in pretty mode
    const handleCopy = useCallback(() => {
        const response = request?.response;
        if (!response?.body) return;
        let text = response.body;
        if (viewMode === 'pretty' && response.json) {
            try {
                text = JSON.stringify(response.json, null, 2);
            } catch { /* fallback to raw */ }
        }
        navigator.clipboard.writeText(text);
    }, [request?.response, viewMode]);

    // Save handler
    const handleSaveResponse = useCallback(() => {
        const response = request?.response;
        if (!response?.body) return;
        const cType = (response.headers['content-type'] || '').toLowerCase();
        let type = 'text/plain';
        let ext = 'txt';
        if (cType.includes('json')) { type = 'application/json'; ext = 'json'; }
        else if (cType.includes('html')) { type = 'text/html'; ext = 'html'; }
        else if (cType.includes('xml')) { type = 'application/xml'; ext = 'xml'; }

        const blob = new Blob([response.body], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `response-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [request?.response]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey)) {
                if (e.key === 's') {
                    e.preventDefault();
                    await handleSave();
                } else if (e.key === 'Enter' || (e.key === 'e' && !e.shiftKey)) {
                    e.preventDefault();
                    handleSend();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [tabId, request, tab]);

    // Initialization & File Loading
    useEffect(() => {
        const init = async () => {
            // Only initialize if not already in store (prevents overwriting on re-renders)
            if (!requests[tabId]) {
                initializeRequest(tabId);

                // If the tab corresponds to a file, load it
                if (tab?.path) {
                    try {
                        const data = await loadRequest(tab.path);
                        if (data) {
                            updateRequest(tabId, data);
                        }
                    } catch (e) {
                        // Error handling is done in store (toasts), just log here
                        console.error("Failed to load request file", e);
                    }
                }
            }
        };
        init();
    }, [tabId, tab?.path]);

    if (!request) return null;

    const handleSave = async () => {
        if (!request) return;
        let savePath = tab?.path;

        if (!savePath) {
            try {
                const selected = await save({
                    filters: [{ name: 'Radius Request', extensions: ['rd'] }]
                });
                if (!selected) return;
                savePath = selected;
                const name = savePath.split(/[\\/]/).pop()?.replace('.rd', '') || 'Request';
                updateTab(tabId, { path: savePath, name });
            } catch (err) {
                console.error('Save dialog failed', err);
                return;
            }
        }

        try {
            await saveRequest(savePath, request);
            markDirty(tabId, false);
            toast.success("Request saved");
        } catch (err) {
            toast.error("Failed to save request");
            console.error(err);
        }
    };

    const handleSend = () => {
        executeRequest(tabId);
        if (isResponseMinimized && responsePanelHandle) {
            responsePanelHandle.expand();
        }
    };

    const handleUpdate = (data: Partial<RequestData>) => {
        updateRequest(tabId, data);
        markDirty(tabId, true);
    };

    const handleUrlChange = (newUrl: string) => {
        const newParams = syncParamsFromUrl(newUrl, request.params);
        handleUpdate({ url: newUrl, params: newParams });
    };

    const handleParamsChange = (newParams: import("./types").KeyValueItem[]) => {
        const newUrl = syncUrlFromParams(request.url, newParams);
        handleUpdate({ url: newUrl, params: newParams });
    };

    return (
        <div className="flex flex-col h-full bg-background" data-testid="request-editor">
            <div className="flex-1 min-h-0 overflow-hidden font-sans">
                <PanelGroup orientation="vertical" disableCursor>
                    {/* Top Pane: Request Editor (Unified Box) */}
                    <Panel defaultSize={DEFAULT_PANEL_SIZE} minSize={15} className="flex flex-col m-1 mb-0 border border-border/20 rounded-lg overflow-hidden shadow-sm bg-card">
                        <AddressBar
                            method={request.method}
                            url={request.url}
                            onMethodChange={(m) => handleUpdate({ method: m })}
                            onUrlChange={handleUrlChange}
                            onSend={handleSend}
                            onSave={handleSave}
                            loading={request.isLoading}
                            onCancel={() => cancelRequest(tabId)}
                        />

                        <Tabs defaultValue="params" className="flex-1 flex flex-col min-h-0 border-t border-border/10">
                            <div className="bg-transparent flex items-center py-2">
                                <TabsList className="h-auto w-full justify-start gap-2 bg-transparent p-0 px-6">
                                    <TabsTrigger
                                        value="params"
                                        className="h-8 px-3 rounded-md font-medium text-xs uppercase tracking-wide text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-muted/5 transition-all"
                                    >
                                        Params
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="auth"
                                        className="h-8 px-3 rounded-md font-medium text-xs uppercase tracking-wide text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-muted/5 transition-all"
                                    >
                                        Authorization
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="headers"
                                        className="h-8 px-3 rounded-md font-medium text-xs uppercase tracking-wide text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-muted/5 transition-all"
                                    >
                                        Headers
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="body"
                                        className="h-8 px-3 rounded-md font-medium text-xs uppercase tracking-wide text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-muted/5 transition-all"
                                    >
                                        Body
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="scripts"
                                        className="h-8 px-3 rounded-md font-medium text-xs uppercase tracking-wide text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary hover:bg-muted/5 transition-all"
                                    >
                                        Scripts
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-hidden flex flex-col">
                                <TabsContent value="params" className="flex-1 m-0 p-0 border-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
                                    <HeadersPanel
                                        headers={request.params}
                                        onChange={handleParamsChange}
                                    />
                                </TabsContent>
                                <TabsContent value="auth" className="flex-1 m-0 p-0 border-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
                                    <AuthPanel
                                        auth={request.auth}
                                        onChange={(auth) => handleUpdate({ auth })}
                                    />
                                </TabsContent>
                                <TabsContent value="headers" className="flex-1 m-0 p-0 border-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
                                    <HeadersPanel
                                        headers={request.headers}
                                        onChange={(items) => handleUpdate({ headers: items })}
                                    />
                                </TabsContent>
                                <TabsContent value="body" className="flex-1 m-0 p-0 border-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
                                    <BodyEditor
                                        content={request.body}
                                        onChange={(content) => handleUpdate({ body: content })}
                                        mode={request.bodyType}
                                        onModeChange={(type) => handleUpdate({ bodyType: type })}
                                        formData={request.formData}
                                        onFormDataChange={(items) => handleUpdate({ formData: items })}
                                        urlEncoded={request.urlEncoded}
                                        onUrlEncodedChange={(items) => handleUpdate({ urlEncoded: items })}
                                        binaryFilePath={request.binaryFilePath}
                                        onBinaryChange={(path) => handleUpdate({ binaryFilePath: path })}
                                        onRun={handleSend}
                                    />
                                </TabsContent>
                                <TabsContent value="scripts" className="flex-1 m-0 p-0 border-0 data-[state=active]:flex data-[state=active]:flex-col">
                                    <Tabs defaultValue="pre-req" className="flex-1 flex flex-col">
                                        <div className="bg-transparent">
                                            <TabsList className="h-9 w-full justify-start gap-4 bg-transparent p-0 px-4">
                                                <TabsTrigger
                                                    value="pre-req"
                                                    className="h-9 rounded-none border-b-2 border-border/20 px-2 font-medium text-[11px] text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent data-[state=active]:bg-transparent shadow-none transition-all"
                                                >
                                                    Pre-request
                                                </TabsTrigger>
                                                <TabsTrigger
                                                    value="tests"
                                                    className="h-9 rounded-none border-b-2 border-border/20 px-2 font-medium text-[11px] text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary bg-transparent data-[state=active]:bg-transparent shadow-none transition-all"
                                                >
                                                    Post-request
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <TabsContent value="pre-req" className="h-full m-0 p-0 border-0">
                                                <ScriptEditor
                                                    content={request.preRequestScript || ''}
                                                    onChange={(content) => handleUpdate({ preRequestScript: content })}
                                                />
                                            </TabsContent>
                                            <TabsContent value="tests" className="h-full m-0 p-0 border-0">
                                                <ScriptEditor
                                                    content={request.testScript || ''}
                                                    onChange={(content) => handleUpdate({ testScript: content })}
                                                />
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </Panel>

                    {/*
                     * ═══ UNIFIED RESPONSE CONTAINER (Boxed) ═══
                     * Handle + Content share sides and bottom rounding.
                     */}
                    <PanelResizeHandle className="h-11 w-[calc(100%-8px)] mx-1 mt-1 highlight-response-header rounded-t-lg z-10 relative cursor-row-resize flex shrink-0 border-x border-t border-border/20 shadow-sm">
                        <ResponseToolbar
                            response={request.response || null}
                            loading={request.isLoading || false}
                            viewMode={viewMode}
                            setViewMode={setViewMode}
                            lineWrap={lineWrap}
                            setLineWrap={setLineWrap}
                            onCopy={handleCopy}
                            onSave={handleSaveResponse}
                            onToggleMinimize={toggleResponsePanel}
                            isMinimized={isResponseMinimized}
                        />
                    </PanelResizeHandle>

                    {/* Bottom Pane: Response Content (collapsible) */}
                    <Panel
                        panelRef={setResponsePanelHandle}
                        collapsible={true}
                        collapsedSize={0}
                        defaultSize={DEFAULT_PANEL_SIZE}
                        minSize={10}
                        onResize={handleResponseResize}
                        className="mx-1 mb-1 border-x border-b border-border/20 rounded-b-lg overflow-hidden bg-card shadow-sm"
                    >
                        <ResponseViewer
                            response={request.response || null}
                            testResults={request.testResults}
                            loading={request.isLoading || false}
                            error={request.error || null}
                            viewMode={viewMode}
                            lineWrap={lineWrap}
                        />
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}
