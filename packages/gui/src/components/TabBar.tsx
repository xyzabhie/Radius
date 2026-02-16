import { useState, useMemo, useRef, useEffect } from "react";
import { X, Plus, ChevronDown, Globe, PanelLeft, FolderOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useTabStore } from "../stores/useTabStore";
import { useEnvironmentStore } from "../stores/environmentStore";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useRequestStore } from "../stores/requestStore";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { toast } from "sonner"; // Assuming sonner is available for notifications
import { VariableInspector } from "./environment/VariableInspector";

interface TabBarProps {
    onToggleSidebar?: () => void;
}

export function TabBar({ onToggleSidebar }: TabBarProps) {
    const { tabs, activeTabId, closeTab, setActiveTab, addTab } = useTabStore();
    const requests = useRequestStore((state) => state.requests);
    const { activeEnvironment, setActiveEnvironment, environments } = useEnvironmentStore();

    // Flatten environments for the dropdown
    const allEnvs = useMemo(() => [
        ...environments.global.map(name => ({ name, scope: 'global' as const })),
        ...environments.project.map(name => ({ name, scope: 'project' as const })),
    ], [environments]);

    const [tabToClose, setTabToClose] = useState<string | null>(null);

    const handleNewTab = () => {
        addTab({ name: "New Request", type: "request" });
    };

    const handleCloseRequest = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const tab = tabs.find(t => t.id === id);

        if (tab?.isDirty) {
            setTabToClose(id);
        } else {
            closeTab(id);
        }
    };

    const confirmClose = () => {
        if (tabToClose) {
            closeTab(tabToClose);
            setTabToClose(null);
        }
    };

    // Save the request to disk, then close the tab
    const handleSaveAndClose = async () => {
        if (!tabToClose) return;
        const tab = tabs.find(t => t.id === tabToClose);
        const request = requests[tabToClose];

        if (tab?.path && request) {
            try {
                const { useCollectionStore } = await import('../stores/useCollectionStore');
                await useCollectionStore.getState().saveRequest(tab.path, request);
                toast.success("Request saved");
            } catch (err) {
                toast.error("Failed to save request");
                console.error(err);
            }
        }
        confirmClose();
    };

    const getMethodColor = (method: string) => {
        switch (method) {
            case "GET": return "text-method-get";
            case "POST": return "text-method-post";
            case "PUT": return "text-method-put";
            case "DELETE": return "text-method-delete";
            case "PATCH": return "text-yellow-500";
            default: return "text-muted-foreground";
        }
    };

    // Scroll Navigation State
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Check if scrolling is possible/needed
    const checkScroll = () => {
        if (tabsContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            // Use a small buffer (1px) for float rendering differences
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        }
    };

    // Re-check scroll on tab changes or resize
    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [tabs]);

    const scrollTabs = (direction: 'left' | 'right') => {
        if (tabsContainerRef.current) {
            const scrollAmount = 200; // Scroll by ~1-2 tabs width
            tabsContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            // Re-check after animation (approx)
            setTimeout(checkScroll, 300);
        }
    };

    return (
        <>
            <div className="flex h-10 w-full items-center border-b border-border/40 bg-background/95 backdrop-blur px-0 pt-1">
                {/* Sidebar Toggle */}
                <div className="flex items-center px-2 h-full border-r border-border/30">
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-70 hover:opacity-100" onClick={onToggleSidebar} title="Toggle Sidebar">
                        <PanelLeft className="h-4 w-4" />
                    </Button>
                </div>

                {/* Scrollable Tabs Area with Navigation Buttons */}
                {/* Scrollable Tabs Area with Navigation Buttons */}
                <div className="flex-1 flex items-center min-w-0 h-full relative group/tabs select-none">
                    <div
                        ref={tabsContainerRef}
                        onScroll={checkScroll}
                        className="flex-1 flex overflow-x-auto overflow-y-hidden no-scrollbar items-end h-full scroll-smooth px-0.5"
                    >
                        {tabs.map((tab) => {
                            const request = requests[tab.id];
                            const method = request?.method || 'GET';

                            return (
                                <div
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    // ... check for active tab to scroll into view potentially?
                                    className={cn(
                                        "group relative flex h-9 items-center justify-between border-r border-r-border/30 px-4 text-sm font-medium transition-all hover:bg-muted/50 cursor-pointer min-w-[120px] max-w-[200px] rounded-t-sm shrink-0",
                                        activeTabId === tab.id
                                            ? "bg-background text-foreground border-t-2 border-t-primary border-b-0 pb-[1px] z-10"
                                            : "text-muted-foreground bg-transparent border-t-2 border-t-transparent border-b border-b-transparent opacity-80"
                                    )}
                                    style={{ marginBottom: activeTabId === tab.id ? '-1px' : '0' }}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        {/* Dynamic Method Indicator */}
                                        {tab.type === 'request' && (
                                            <span className={cn("text-[10px] font-bold uppercase",
                                                getMethodColor(method),
                                                activeTabId === tab.id ? "opacity-100" : "opacity-70"
                                            )}>
                                                {method}
                                            </span>
                                        )}
                                        <span className="truncate">{tab.name}</span>
                                        {tab.isDirty && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                    </div>

                                    <button
                                        onClick={(e) => handleCloseRequest(tab.id, e)}
                                        className="ml-2 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 p-0.5 text-muted-foreground transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            );
                        })}
                        {/* Spacer for scroll buttons if overflow exists */}
                        {(canScrollLeft || canScrollRight) && <div className="w-12 shrink-0" />}
                    </div>

                    {/* Grouped Scroll Buttons (Right Side) */}
                    {(canScrollLeft || canScrollRight) && (
                        <div className="absolute right-0 z-20 h-full pl-8 pr-1 bg-gradient-to-l from-background via-background to-transparent flex items-center gap-0.5">
                            <button
                                onClick={() => scrollTabs('left')}
                                disabled={!canScrollLeft}
                                className={cn("h-6 w-6 rounded-md flex items-center justify-center transition-all",
                                    canScrollLeft
                                        ? "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                        : "opacity-30 cursor-default text-muted-foreground/50"
                                )}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => scrollTabs('right')}
                                disabled={!canScrollRight}
                                className={cn("h-6 w-6 rounded-md flex items-center justify-center transition-all",
                                    canScrollRight
                                        ? "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                        : "opacity-30 cursor-default text-muted-foreground/50"
                                )}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center px-2.5 border-l border-border/30 h-full gap-1.5 shrink-0">
                    {/* Environment Switcher */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 font-normal text-muted-foreground hover:text-foreground rounded-md">
                                <Globe className="h-3.5 w-3.5" />
                                <span className={cn("max-w-[100px] truncate", activeEnvironment && "font-medium text-foreground")}>
                                    {activeEnvironment ? activeEnvironment.name : "No Env"}
                                </span>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setActiveEnvironment(null)}>
                                <div className="flex items-center gap-2 w-full">
                                    <span className={cn("h-1.5 w-1.5 rounded-full", !activeEnvironment ? "bg-muted-foreground" : "bg-transparent")} />
                                    No Environment
                                </div>
                            </DropdownMenuItem>
                            {allEnvs.map(env => (
                                <DropdownMenuItem key={`${env.scope}:${env.name}`} onClick={() => setActiveEnvironment(env)}>
                                    <div className="flex items-center gap-2 w-full">
                                        <span className={cn("h-1.5 w-1.5 rounded-full",
                                            activeEnvironment?.name === env.name && activeEnvironment?.scope === env.scope ? "bg-primary" : "bg-transparent")} />
                                        {env.scope === 'global'
                                            ? <Globe className="h-3 w-3 text-blue-400" />
                                            : <FolderOpen className="h-3 w-3 text-amber-400" />}
                                        {env.name}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <VariableInspector />

                    <div className="w-[1px] h-4 bg-border/40 mx-0.5" />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md opacity-70 hover:opacity-100"
                        onClick={handleNewTab}
                        title="New Request"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={!!tabToClose}
                title="Unsaved Changes"
                description="Do you want to save your changes to this request?"
                confirmText="Save"
                alternateText="Don't Save"
                cancelText="Cancel"
                variant="default"
                onConfirm={handleSaveAndClose}
                onAlternate={confirmClose}
                onCancel={() => setTabToClose(null)}
            />
        </>
    );
}
