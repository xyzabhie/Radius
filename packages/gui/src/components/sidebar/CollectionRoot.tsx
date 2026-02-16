import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronRight, FilePlus, FolderPlus, Trash2, MoreHorizontal } from "lucide-react";
import { cn } from "../../lib/utils";
import { useCollectionStore, FileNode } from "../../stores/useCollectionStore";
import { useTabStore } from "../../stores/useTabStore";
import { FileTreeItem } from "./FileTreeItem";
import { toast } from "sonner";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "../ui/context-menu";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from "../ui/dropdown-menu";

interface CollectionRootProps {
    rootPath: string;
    nodes: FileNode[];
}

export function CollectionRoot({ rootPath, nodes }: CollectionRootProps) {
    const { removeCollection, createRequest, createFolder } = useCollectionStore();
    const rootName = rootPath.split(/[\\/]/).pop() || rootPath;

    // State
    const [isOpen, setIsOpen] = useState(true);
    const hasUserCollapsed = useRef(false); // Track if user manually collapsed

    // Tab State for Auto-Expansion (Granular Selector)
    const shouldExpand = useTabStore(useCallback(state =>
        !!(state.activeTabId && state.activeTabId.startsWith(rootPath)),
        [rootPath]));

    // Auto-Expand Root if active tab is inside (but respect manual collapse)
    useEffect(() => {
        if (shouldExpand && !isOpen && !hasUserCollapsed.current) {
            setIsOpen(true);
        }
        if (!shouldExpand) {
            hasUserCollapsed.current = false;
        }
    }, [shouldExpand]);

    const [creationType, setCreationType] = useState<'request' | 'folder' | null>(null);
    const [creationName, setCreationName] = useState("");
    const [activeMenu, setActiveMenu] = useState(false); // For visual highlight

    const handleCreateClick = (type: 'request' | 'folder') => {
        if (!isOpen) setIsOpen(true);
        setCreationType(type);
        setCreationName("");
    };

    const submitCreation = async () => {
        if (!creationName.trim()) {
            setCreationType(null);
            return;
        }

        try {
            if (creationType === 'request') {
                await createRequest(rootPath, creationName.trim());
                toast.success("Request created");
            } else {
                await createFolder(rootPath, creationName.trim());
                toast.success("Folder created");
            }
        } catch (err) {
            toast.error(`Failed to create ${creationType}`);
        } finally {
            setCreationType(null);
        }
    };

    const handleCreationKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            submitCreation();
        } else if (e.key === 'Escape') {
            setCreationType(null);
        }
    };

    return (
        <div className="mb-4">
            {/* Root Header: Context Menu + Visual Dropdown */}
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        className={cn(
                            "px-2 py-1.5 text-[11px] font-bold flex items-center justify-between group cursor-context-menu transition-colors rounded-sm mx-1 mt-1 select-none border border-transparent",
                            (activeMenu || creationType) ? "bg-accent/50 text-accent-foreground border-border/50" : "bg-card hover:bg-muted/50 text-foreground/80 hover:text-foreground mb-0.5"
                        )}
                        onClick={() => {
                            const willCollapse = isOpen;
                            if (willCollapse) {
                                hasUserCollapsed.current = true;
                            }
                            setIsOpen(!isOpen);
                        }}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-90")} />
                            <span className="truncate" title={rootPath}>{rootName.toUpperCase()}</span>
                        </div>

                        {/* Visual 3-Dot Menu */}
                        <DropdownMenu
                            open={activeMenu}
                            onOpenChange={setActiveMenu}
                        >
                            <DropdownMenuTrigger asChild>
                                <div
                                    role="button"
                                    className={cn(
                                        "h-4 w-4 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground transition-all",
                                        activeMenu ? "opacity-100 bg-background/50" : "opacity-0 group-hover:opacity-100 hover:bg-muted"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    <MoreHorizontal className="h-3 w-3" />
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal overflow-hidden text-ellipsis">
                                    {rootName}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCreateClick('request'); }}>
                                    <FilePlus className="mr-2 h-3.5 w-3.5" />
                                    New Request
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCreateClick('folder'); }}>
                                    <FolderPlus className="mr-2 h-3.5 w-3.5" />
                                    New Folder
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); removeCollection(rootPath); }}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    Remove Collection
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                    <ContextMenuItem onClick={() => handleCreateClick('request')}>
                        <FilePlus className="mr-2 h-4 w-4" />
                        New Request
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleCreateClick('folder')}>
                        <FolderPlus className="mr-2 h-4 w-4" />
                        New Folder
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        onClick={() => removeCollection(rootPath)}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Collection
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            {/* List Content */}
            {isOpen && (
                <div className="mt-1">
                    {/* Inline Creation Input */}
                    {creationType && (
                        <div
                            className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium"
                            style={{ paddingLeft: '20px' }} // Indent for root children (Level 0: 0*16 + 20)
                        >
                            {creationType === 'folder' ? (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground rotate-90" />
                            ) : (
                                <span className={cn("text-[9px] font-bold w-8 text-right uppercase text-muted-foreground")}>
                                    GET
                                </span>
                            )}
                            <input
                                autoFocus
                                value={creationName}
                                onChange={(e) => setCreationName(e.target.value)}
                                onKeyDown={handleCreationKeyDown}
                                onBlur={submitCreation}
                                onClick={(e) => e.stopPropagation()}
                                placeholder={creationType === 'request' ? "Request Name" : "Folder Name"}
                                className="h-5 flex-1 bg-background border border-input rounded-sm px-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>
                    )}

                    {nodes.map(node => (
                        <FileTreeItem key={node.id} node={node} />
                    ))}
                    {nodes.length === 0 && !creationType && (
                        <div className="px-5 text-xs text-muted-foreground italic">Empty folder</div>
                    )}
                </div>
            )}
        </div>
    );
}
