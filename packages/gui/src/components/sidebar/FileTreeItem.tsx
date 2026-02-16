import { cn } from "../../lib/utils";
import { FileNode, useCollectionStore } from "../../stores/useCollectionStore";
import { useTabStore } from "../../stores/useTabStore";
import { useRequestStore } from "../../stores/requestStore";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import { ChevronRight, MoreHorizontal, FolderPlus, Folder, Trash2, Pencil, Copy, FolderOpen, Plus } from "lucide-react";
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
} from "../ui/dropdown-menu";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { toast } from "sonner";
import { revealItemInDir } from '@tauri-apps/plugin-opener';

interface FileTreeItemProps {
    node: FileNode;
    level?: number;
}

export const FileTreeItem = memo(({ node, level = 0 }: FileTreeItemProps) => {
    const { addTab } = useTabStore(state => ({ addTab: state.addTab }));
    const requests = useRequestStore(state => state.requests);
    const { renameItem, deleteItem, createRequest, createFolder, duplicateRequest } = useCollectionStore();

    // State
    const [isOpen, setIsOpen] = useState(false);
    const hasUserCollapsed = useRef(false); // Track if user manually collapsed


    // Tab State: Granular Subscriptions (Performance Optimization)
    // 1. Is this the active item?
    const isActive = useTabStore(useCallback(state => state.activeTabId === node.id, [node.id]));

    // 2. Is this a parent of the active item? (For Auto-Expansion)
    const isParentOfActive = useTabStore(useCallback(state => {
        if (node.type !== 'directory' || !state.activeTabId) return false;
        // Use prefix match with separator check
        return state.activeTabId.startsWith(node.id + '\\') || state.activeTabId.startsWith(node.id + '/');
    }, [node.id, node.type]));

    // Auto-Expand Effect: only auto-expand if the user hasn't manually collapsed
    useEffect(() => {
        if (isParentOfActive && !isOpen && !hasUserCollapsed.current) {
            setIsOpen(true);
        }
        // Reset the user-collapsed flag when the active child changes away
        if (!isParentOfActive) {
            hasUserCollapsed.current = false;
        }
    }, [isParentOfActive]);

    const [activeMenu, setActiveMenu] = useState<'plus' | 'more' | null>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

    // Dialog States
    const [showDelete, setShowDelete] = useState(false);

    // Helper for input selection
    const handleRenameFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
    };

    const [creationType, setCreationType] = useState<'file' | 'folder' | null>(null);
    const [creationName, setCreationName] = useState("");

    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");

    // Effect to handle focus when renaming starts
    useEffect(() => {
        if (isRenaming && renameInputRef.current) {
            // Small timeout to bypass Radix UI focus restoration
            const timer = setTimeout(() => {
                renameInputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isRenaming]);

    const startRename = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setRenameValue(node.name.replace('.rd', ''));
        setIsRenaming(true);
    };

    const submitRename = async () => {
        const trimmedValue = renameValue.trim();
        const originalName = node.name.replace('.rd', '');

        // If empty or unchanged, just cancel
        if (!trimmedValue || trimmedValue === originalName) {
            setIsRenaming(false);
            return;
        }

        // If changed, attempt rename
        await handleRename(trimmedValue);
        setIsRenaming(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.stopPropagation(); // Prevent bubbling
            submitRename();
        } else if (e.key === 'Escape') {
            e.stopPropagation(); // Prevent bubbling
            setIsRenaming(false);
        }
    };

    // Creation Handlers
    const startCreateRequest = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCreationType('file');
        setCreationName("");
        if (!isOpen) setIsOpen(true);
    };

    const startCreateFolder = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCreationType('folder');
        setCreationName("");
        if (!isOpen) setIsOpen(true);
    };

    const submitCreation = async () => {
        if (!creationName.trim()) {
            setCreationType(null);
            return;
        }

        try {
            if (creationType === 'file') {
                await createRequest(node.id, creationName.trim());
                toast.success("Request created");
            } else {
                await createFolder(node.id, creationName.trim());
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
            e.stopPropagation();
            submitCreation();
        } else if (e.key === 'Escape') {
            e.stopPropagation();
            setCreationType(null);
        }
    };

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.type === 'directory') {
            const willCollapse = isOpen;
            if (willCollapse) {
                hasUserCollapsed.current = true; // Mark as user-collapsed
            }
            setIsOpen(!isOpen);
        } else {
            addTab({
                name: node.name.replace('.rd', ''),
                type: 'request',
                id: node.id,
                path: node.id
            });
        }
    };

    const handleRename = async (newName: string) => {
        try {
            const isWindows = node.id.includes('\\');
            const sep = isWindows ? '\\' : '/';
            // Find parent path by removing the last segment
            const lastSepIndex = node.id.lastIndexOf(sep);
            const parentPath = node.id.substring(0, lastSepIndex);

            const extension = node.type === 'file' && !newName.endsWith('.rd') ? '.rd' : '';
            const newPath = `${parentPath}${sep}${newName}${extension}`;

            await renameItem(node.id, newPath);

            // Sync with Tab Store if open
            const { tabs, updateTab, renameFolderTabs } = useTabStore.getState();

            if (node.type === 'directory') {
                renameFolderTabs(node.id, newPath);
            } else {
                if (tabs.some(t => t.id === node.id || t.path === node.id)) {
                    // Update single file tab
                    // Note: If ID matches path, updateTab handles ID updates if we implemented it right?
                    // Actually useTabStore.updateTab logic: "if ID is changing..."
                    // We need to match by OLD ID
                    updateTab(node.id, {
                        id: newPath,
                        path: newPath,
                        name: newName.replace('.rd', '')
                    });
                }
            }

            toast.success("Renamed successfully");
        } catch (err) {
            toast.error("Failed to rename");
            console.error(err);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteItem(node.id);
            const { closeTab, closeFolderTabs } = useTabStore.getState();

            if (node.type === 'directory') {
                closeFolderTabs(node.id);
            } else {
                closeTab(node.id); // Close tab if open
            }

            toast.success("Deleted successfully");
            setShowDelete(false);
        } catch (err) {
            toast.error("Failed to delete");
        }
    };

    const handleReveal = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            await revealItemInDir(node.id);
        } catch (err) {
            toast.error("Failed to reveal item");
            console.error(err);
        }
    };

    const handleDuplicate = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (node.type !== 'file') return;
        try {
            if (duplicateRequest) { // Check if function exists (safety)
                await duplicateRequest(node.id);
                toast.success("Duplicated successfully");
            } else {
                toast.error("Duplicate not implemented");
            }
        } catch (err) {
            toast.error("Failed to duplicate");
        }
    }

    const startDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDelete(true);
    }

    const isRequest = node.type === 'file';
    const requestData = isRequest ? requests[node.id] : null;
    const method = requestData?.method || 'GET';

    const getMethodColor = (m: string) => {
        switch (m) {
            case "GET": return "text-method-get";
            case "POST": return "text-method-post";
            case "PUT": return "text-method-put";
            case "DELETE": return "text-method-delete";
            case "PATCH": return "text-yellow-500";
            default: return "text-muted-foreground";
        }
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        className={cn(
                            "group flex items-center gap-1.5 px-2 py-1 text-[13px] font-normal rounded-sm cursor-pointer select-none transition-all relative border border-transparent",
                            // Hover/Active State
                            !isRenaming && !isActive && "hover:bg-accent/40 hover:text-accent-foreground text-muted-foreground",
                            (!isRenaming && (isActive || isOpen || activeMenu !== null)) && "text-foreground", // Generally brighter text for 'involved' items
                            (isActive && !isRenaming) && "bg-primary/10 font-medium text-primary border-primary/20", // Active Item: Primary Color (Sky Blue matching active tab)
                            (!isActive && (isOpen || activeMenu !== null) && !isRenaming) && "bg-accent/30" // Softer highlight for Open Folders / Menu Active
                        )}
                        style={{ paddingLeft: `${level * 16 + 20}px` }}
                        onClick={handleSelect}
                    >
                        {/* Indentation Guides */}
                        {Array.from({ length: level + 1 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 w-px bg-border/30"
                                style={{ left: `${i * 16 + 12}px` }} // 12px base (Root Align) + 16px step
                            />
                        ))}

                        {node.type === 'directory' ? (
                            <>
                                <ChevronRight className={cn("h-3 w-3 text-muted-foreground/70 transition-transform shrink-0", isOpen && "rotate-90")} />
                                <span className="sr-only">Folder</span>
                                {/* Visual Folder Icon could go here, but Chevron is standard VS Code. Let's stick to Chevron but maybe add Folder Icon if user requested? "UI/UX changes for better visibility". Folder icon helps. */}
                                <Folder className={cn("h-3.5 w-3.5 mr-0.5 shrink-0", isOpen ? "text-foreground" : "text-muted-foreground")} />
                            </>
                        ) : (
                            <span className={cn("text-[10px] font-bold w-9 text-right uppercase shrink-0 font-mono tracking-tighter", getMethodColor(method))}>
                                {method}
                            </span>
                        )}

                        {isRenaming ? (
                            <input
                                ref={renameInputRef}
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={submitRename}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={handleRenameFocus}
                                className="h-5 flex-1 bg-background border border-primary rounded-sm px-1 text-xs outline-none shadow-sm selection:bg-blue-200 selection:text-blue-900"
                            />
                        ) : (
                            <span className="truncate flex-1">
                                {node.name.replace('.rd', '')}
                            </span>
                        )}

                        {/* Hover Actions */}
                        <div className={cn(
                            "flex items-center gap-0.5 absolute right-1 transition-opacity",
                            (activeMenu !== null) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}>
                            {/* Plus Icon (Folders Only) */}
                            {node.type === 'directory' && (
                                <DropdownMenu
                                    open={activeMenu === 'plus'}
                                    onOpenChange={(open) => setActiveMenu(open ? 'plus' : null)}
                                >
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <div className={cn(
                                            "h-6 w-6 flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
                                            activeMenu === 'plus' && "bg-muted text-foreground"
                                        )}>
                                            <Plus className="h-3.5 w-3.5" />
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={startCreateRequest}>
                                            <Plus className="mr-2 h-3.5 w-3.5" />
                                            New Request
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={startCreateFolder}>
                                            <FolderPlus className="mr-2 h-3.5 w-3.5" />
                                            New Folder
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {/* 3-Dot Menu (All Items) */}
                            <DropdownMenu
                                open={activeMenu === 'more'}
                                onOpenChange={(open) => setActiveMenu(open ? 'more' : null)}
                            >
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <div className={cn(
                                        "h-6 w-6 flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
                                        activeMenu === 'more' && "bg-muted text-foreground"
                                    )}>
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={startRename}>
                                        <Pencil className="mr-2 h-3.5 w-3.5" />
                                        Rename
                                    </DropdownMenuItem>

                                    {node.type === 'file' && (
                                        <DropdownMenuItem onClick={handleDuplicate}>
                                            <Copy className="mr-2 h-3.5 w-3.5" />
                                            Duplicate
                                        </DropdownMenuItem>
                                    )}

                                    <DropdownMenuItem onClick={handleReveal}>
                                        <FolderOpen className="mr-2 h-3.5 w-3.5" />
                                        Reveal in File Explorer
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={startDelete}>
                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </ContextMenuTrigger>

                {/* Right Click Context Menu (Parity with 3-dot + Creation) */}
                <ContextMenuContent className="w-48">
                    {node.type === 'directory' && (
                        <>
                            <ContextMenuItem onClick={startCreateRequest}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Request
                            </ContextMenuItem>
                            <ContextMenuItem onClick={startCreateFolder}>
                                <FolderPlus className="mr-2 h-4 w-4" />
                                New Folder
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                        </>
                    )}
                    <ContextMenuItem onClick={handleReveal}>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Reveal in File Explorer
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={startRename}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                    </ContextMenuItem>
                    {node.type === 'file' && (
                        <ContextMenuItem onClick={handleDuplicate}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                        </ContextMenuItem>
                    )}
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={startDelete}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>


            {/* Inline Creation Input (Child) */}
            {isOpen && creationType && (
                <div
                    className="flex items-center gap-1.5 px-2 py-1 text-sm font-medium"
                    style={{ paddingLeft: `${(level + 1) * 16 + 20}px` }}
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
                        placeholder={creationType === 'file' ? "Request Name" : "Folder Name"}
                        className="h-5 flex-1 bg-background border border-input rounded-sm px-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>
            )}

            {/* Recursion for children */}
            {isOpen && node.children && (
                <div>
                    {node.children.map(child => (
                        <FileTreeItem key={child.id} node={child} level={level + 1} />
                    ))}
                </div>
            )}


            <ConfirmDialog
                isOpen={showDelete}
                onCancel={() => setShowDelete(false)}
                title={`Delete ${node.name}?`}
                description="This action cannot be undone."
                confirmText="Delete"
                variant="destructive"
                onConfirm={handleDelete}
            />
        </>
    );
});
