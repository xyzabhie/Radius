import { Globe, Plus, FolderOpen, ChevronRight, ChevronDown, Pencil, Import } from "lucide-react";
import { cn } from "../../lib/utils";
import { useEnvironmentStore } from "../../stores/environmentStore";
import { useTabStore } from "../../stores/useTabStore";
import { useCollectionStore } from "../../stores/useCollectionStore";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { toast } from "sonner";
import { useState, useRef, useEffect, useCallback } from "react";
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import * as yaml from 'js-yaml';

interface EnvironmentViewProps {
    onCreateClick: () => void;
}

export function EnvironmentView({ onCreateClick }: EnvironmentViewProps) {
    const { environments, deleteEnvironment, renameEnvironment, loadEnvironments } = useEnvironmentStore();
    const { addTab } = useTabStore();
    const { roots } = useCollectionStore();

    // Collapsible states
    const [isGlobalOpen, setIsGlobalOpen] = useState(true);
    const [isProjectOpen, setIsProjectOpen] = useState(true);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<{ name: string; scope: 'global' | 'project' } | null>(null);

    // Inline rename state
    const [renaming, setRenaming] = useState<{ name: string; scope: 'global' | 'project' } | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const renameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (renaming && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [renaming]);

    const handleOpenEnv = (envName: string, scope: 'global' | 'project') => {
        addTab({
            name: envName,
            type: 'environment',
            id: `${scope}:${envName}`,
            isDirty: false,
            data: { scope }
        });
    };

    const handleDeleteEnv = async (e: React.MouseEvent, envName: string, scope: 'global' | 'project') => {
        e.stopPropagation();
        setDeleteTarget({ name: envName, scope });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteEnvironment(deleteTarget.name, deleteTarget.scope);
            const { tabs, closeTab } = useTabStore.getState();
            const tabId = `${deleteTarget.scope}:${deleteTarget.name}`;
            if (tabs.some(t => t.id === tabId)) {
                closeTab(tabId);
            }
            toast.success(`Deleted ${deleteTarget.name}`);
        } catch (err) {
            toast.error("Failed to delete");
        } finally {
            setDeleteTarget(null);
        }
    };

    const startRename = (e: React.MouseEvent, name: string, scope: 'global' | 'project') => {
        e.stopPropagation();
        setRenaming({ name, scope });
        setRenameValue(name);
    };

    const commitRename = useCallback(async () => {
        if (!renaming) return;
        const newName = renameValue.trim();
        if (!newName || newName === renaming.name) {
            setRenaming(null);
            return;
        }
        try {
            await renameEnvironment(renaming.name, newName, renaming.scope);
            // Update open tab if any
            const { tabs, updateTab } = useTabStore.getState();
            const oldTabId = `${renaming.scope}:${renaming.name}`;
            const newTabId = `${renaming.scope}:${newName}`;
            const tab = tabs.find(t => t.id === oldTabId);
            if (tab) {
                updateTab(oldTabId, { id: newTabId, name: newName });
            }
            toast.success(`Renamed to ${newName}`);
        } catch (err) {
            toast.error("Failed to rename");
        } finally {
            setRenaming(null);
        }
    }, [renaming, renameValue, renameEnvironment]);

    const handleImport = async () => {
        try {
            const selected = await openDialog({
                filters: [
                    { name: 'Environment Files', extensions: ['rd', 'json', 'yaml', 'yml'] }
                ],
                multiple: false,
            });
            if (!selected) return;
            const filePath = typeof selected === 'string' ? selected : selected;
            const content = await readTextFile(filePath);

            // Try to detect format
            let profile: any = null;
            if (filePath.endsWith('.json')) {
                // Postman-style environment
                const parsed = JSON.parse(content);
                if (parsed.values && Array.isArray(parsed.values)) {
                    // Postman format
                    const vars: Record<string, any> = {};
                    for (const v of parsed.values) {
                        vars[v.key] = {
                            value: v.value || '',
                            type: v.type === 'secret' ? 'secret' : 'string',
                            enabled: v.enabled !== false
                        };
                    }
                    profile = {
                        meta: { version: 2, name: parsed.name || 'Imported', description: 'Imported from Postman' },
                        variables: vars
                    };
                }
            }

            if (!profile) {
                // Try as YAML (Radius .rd format)
                profile = yaml.load(content) as any;
            }

            if (!profile || !profile.variables) {
                toast.error("Could not parse environment file");
                return;
            }

            // Save via store (default to global scope)
            const scope = roots.length > 0 ? 'project' : 'global';
            const { saveEnvironment, createEnvironment } = useEnvironmentStore.getState();

            // Ensure the name is set
            if (!profile.meta) profile.meta = { version: 2, name: 'Imported' };
            if (!profile.meta.name) profile.meta.name = 'Imported';

            await createEnvironment(profile.meta.name, scope);
            await saveEnvironment(profile, scope);
            await loadEnvironments();
            toast.success(`Imported "${profile.meta.name}"`);
        } catch (err) {
            console.error('Import failed:', err);
            toast.error("Failed to import environment");
        }
    };

    const EnvironmentList = ({
        items,
        scope,
        isOpen,
        onToggle,
        icon: Icon
    }: {
        items: string[],
        scope: 'global' | 'project',
        isOpen: boolean,
        onToggle: () => void,
        icon: React.ElementType
    }) => {
        return (
            <div className="mb-2">
                <div
                    className="flex items-center px-2 py-1 cursor-pointer hover:bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none"
                    onClick={onToggle}
                >
                    {isOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                    <span>{scope === 'global' ? 'Global' : 'Project'}</span>
                    <span className="ml-auto text-[10px] opacity-60">{items.length}</span>
                </div>

                {isOpen && (
                    <div className="pl-0">
                        {items.length === 0 ? (
                            <div className="px-6 py-2 text-xs text-muted-foreground italic opacity-70">
                                No environments
                            </div>
                        ) : (
                            items.map(env => {
                                const isRenaming = renaming?.name === env && renaming?.scope === scope;
                                return (
                                    <div
                                        key={env}
                                        className="group flex items-center gap-2 px-3 pl-6 py-1.5 text-sm font-medium hover:bg-muted/50 cursor-pointer select-none border-l-2 border-transparent hover:border-muted-foreground/50 transition-colors"
                                        onClick={() => !isRenaming && handleOpenEnv(env, scope)}
                                    >
                                        <Icon className={cn("h-3.5 w-3.5 shrink-0", scope === 'global' ? "text-blue-400" : "text-amber-400")} />

                                        {isRenaming ? (
                                            <input
                                                ref={renameInputRef}
                                                className="flex-1 bg-muted/50 border border-border rounded px-1.5 py-0.5 text-xs text-foreground outline-none focus:border-primary min-w-0"
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onBlur={commitRename}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') commitRename();
                                                    if (e.key === 'Escape') setRenaming(null);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <span className="flex-1 truncate text-foreground/90">{env}</span>
                                        )}

                                        {!isRenaming && (
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div
                                                    className="p-1 hover:bg-muted rounded"
                                                    onClick={(e) => startRename(e, env, scope)}
                                                    title="Rename"
                                                >
                                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                                </div>
                                                <div
                                                    className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded"
                                                    onClick={(e) => handleDeleteEnv(e, env, scope)}
                                                    title="Delete"
                                                >
                                                    <span className="text-[10px] font-bold block leading-none w-3 h-3 text-center">×</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="flex flex-col h-full w-full justify-start min-w-0 overflow-hidden select-none">
                {/* Header */}
                <div className="h-10 px-3 flex items-center justify-between text-xs font-medium text-foreground uppercase tracking-wider border-b shrink-0 bg-card select-none">
                    <span>Environments</span>
                    <div className="flex items-center gap-1">
                        <div title="Import Environment" className="cursor-pointer hover:text-foreground transition-colors" onClick={handleImport}>
                            <Import className="h-3.5 w-3.5" />
                        </div>
                        <div title="New Environment" className="cursor-pointer hover:text-foreground transition-colors" onClick={onCreateClick}>
                            <Plus className="h-3.5 w-3.5" />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto py-2">
                    {/* Global Section - Always Visible */}
                    <EnvironmentList
                        items={environments.global}
                        scope="global"
                        isOpen={isGlobalOpen}
                        onToggle={() => setIsGlobalOpen(!isGlobalOpen)}
                        icon={Globe}
                    />

                    {/* Project Section - Conditional */}
                    {roots.length > 0 ? (
                        <EnvironmentList
                            items={environments.project}
                            scope="project"
                            isOpen={isProjectOpen}
                            onToggle={() => setIsProjectOpen(!isProjectOpen)}
                            icon={FolderOpen}
                        />
                    ) : (
                        <div className="mt-4 px-4 py-6 border-t border-dashed border-border/40 text-center">
                            <FolderOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                            <p className="text-xs text-muted-foreground">Open a folder to see<br />Project Environments</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                onCancel={() => setDeleteTarget(null)}
                title={`Delete ${deleteTarget?.name}?`}
                description={`This will permanently delete the ${deleteTarget?.scope} environment "${deleteTarget?.name}". This action cannot be undone.`}
                confirmText="Delete"
                variant="destructive"
                onConfirm={confirmDelete}
            />
        </>
    );
}
