import { FolderOpen, Plus, FolderPlus } from "lucide-react";
import { Button } from "../ui/button";
import { CollectionRoot } from "./CollectionRoot";
import { useCollectionStore } from "../../stores/useCollectionStore";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useState } from "react";
import { CreateDialog } from "../CreateDialog";


export function ExplorerView() {
    const { roots, fileTree, addCollection, createCollection, importPostmanCollection } = useCollectionStore();

    // Top Menu Dialog State
    const [showNewColDialog, setShowNewColDialog] = useState(false);

    const handleCreateCollection = async (name: string) => {
        try {
            await createCollection(name);
        } catch (e) {
            // Toast handled in store
        }
    };

    return (
        <div className="flex flex-col h-full w-full justify-start select-none">
            {/* Header */}
            <div className="h-10 px-3 flex items-center justify-between text-xs font-medium text-foreground uppercase tracking-wider border-b shrink-0 bg-card">
                <span>Collections</span>

                {/* Top Action Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div title="New..." className="cursor-pointer hover:text-foreground transition-colors p-1 rounded-sm hover:bg-muted/50">
                            <Plus className="h-3.5 w-3.5" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setShowNewColDialog(true)}>
                            <FolderPlus className="mr-2 h-3.5 w-3.5" />
                            New Collection
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={addCollection}>
                            <FolderOpen className="mr-2 h-3.5 w-3.5" />
                            Open Collection
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={importPostmanCollection}>
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            Import from Postman
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Content */}
            {roots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 text-center">
                    <FolderOpen className="h-10 w-10 mb-3 opacity-30" />
                    <p className="font-medium mb-1">No Open Folder</p>
                    <p className="text-xs opacity-70 mb-4">Open a local folder to start.</p>
                    <Button variant="outline" size="sm" onClick={addCollection}>
                        Open Folder
                    </Button>
                </div>
            ) : (
                <div className="flex-1 overflow-auto py-2">
                    {roots.map(rootPath => {
                        const nodes = fileTree[rootPath] || [];
                        return (
                            <CollectionRoot
                                key={rootPath}
                                rootPath={rootPath}
                                nodes={nodes}
                            />
                        );
                    })}
                </div>
            )}

            <CreateDialog
                open={showNewColDialog}
                onOpenChange={setShowNewColDialog}
                title="New Collection"
                placeholder="Collection Name"
                confirmText="Create"
                onConfirm={handleCreateCollection}
            />
        </div>
    );
}
