import { useEffect, useState } from "react";
import { useEnvironmentStore } from "../../stores/environmentStore";
import { useTabStore } from "../../stores/useTabStore";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Save } from "lucide-react";
import { EnvironmentTable, EnvironmentTableItem } from "./EnvironmentTable";
import { EnvironmentProfile } from "@radius/core/environment";

interface EnvironmentEditorProps {
    tabId: string; // The environment name (e.g. 'local')
}

export function EnvironmentEditor({ tabId }: EnvironmentEditorProps) {
    const { initManager, saveEnvironment } = useEnvironmentStore();
    const { markDirty } = useTabStore();
    const [items, setItems] = useState<EnvironmentTableItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // Force advanced mode by default (removed toggle)
    // const [simpleMode, setSimpleMode] = useState(false); 

    // Parse tabId format: "scope:name"
    const [scope, envName] = tabId.includes(':')
        ? [tabId.split(':')[0] as 'global' | 'project', tabId.split(':').slice(1).join(':')]
        : ['project' as const, tabId];

    useEffect(() => {
        loadContent();
    }, [tabId]);

    const loadContent = async () => {
        setIsLoading(true);
        try {
            const manager = await initManager();
            const profile = await manager.load(envName, scope);

            // Map V2 Profile to Table Items
            const loadedItems: EnvironmentTableItem[] = Object.entries(profile.variables).map(([key, def]) => ({
                id: crypto.randomUUID(),
                key,
                value: def.value,
                type: (def.type as any) || 'string',
                description: def.description || "",
                sensitive: def.sensitive || false,
                enabled: def.enabled !== false
            }));

            // Add empty row
            loadedItems.push({
                id: crypto.randomUUID(),
                key: "",
                value: "",
                type: 'string',
                description: "",
                sensitive: false,
                enabled: true
            });

            setItems(loadedItems);
        } catch (err) {
            console.error("Failed to load environment:", err);
            toast.error("Failed to load environment");
            // Fallback empty
            setItems([{
                id: crypto.randomUUID(),
                key: "",
                value: "",
                type: 'string',
                description: "",
                sensitive: false,
                enabled: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            // Reconstruct V2 Profile
            const variables: Record<string, any> = {};

            items.forEach(item => {
                if (item.key) {
                    variables[item.key] = {
                        value: item.value,
                        type: item.type,
                        description: item.description,
                        sensitive: item.sensitive,
                        enabled: item.enabled
                    };
                }
            });

            const profile: EnvironmentProfile = {
                meta: {
                    version: 2,
                    name: envName,
                    description: "Updated via GUI"
                },
                variables
            };

            await saveEnvironment(profile, scope);
            markDirty(tabId, false);
            toast.success("Environment saved");
        } catch (err) {
            toast.error("Failed to save environment");
            console.error(err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleSave();
        }
    };

    if (isLoading) {
        return <div className="p-4 text-muted-foreground text-sm">Loading Environment...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-background" onKeyDown={handleKeyDown}>
            {/* Toolbar */}
            <div className="h-14 border-b border-border/40 flex items-center justify-between px-6 shrink-0 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-base tracking-tight">{envName}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/50 border border-border/20 px-2 py-0.5 rounded-full">
                        {scope === 'global' ? 'Global' : 'Project'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSave} className="gap-1.5 h-8 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                        <Save className="h-3.5 w-3.5" />
                        Save
                    </Button>
                </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 flex flex-col min-h-0 p-4">
                <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col min-h-0">
                    <div className="mb-6 shrink-0">
                        <h2 className="text-lg font-semibold mb-1">Variables</h2>
                        <p className="text-sm text-muted-foreground">
                            Define variables with strict types, descriptions, and secret masking.
                        </p>
                    </div>

                    <div className="flex-1 min-h-0 bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden p-2">
                        <EnvironmentTable
                            items={items}
                            onChange={(newItems) => {
                                setItems(newItems);
                                markDirty(tabId, true);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
