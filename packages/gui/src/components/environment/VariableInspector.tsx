import { Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../ui/popover";
import { useEnvironmentStore } from "../../stores/environmentStore";
import { useEffect, useState } from "react";
import yaml from "js-yaml";

interface VariableDefinition {
    value: string;
    type?: string;
    sensitive?: boolean;
    enabled?: boolean;
    description?: string;
}

interface EnvironmentFileV2 {
    meta?: { name: string; version: number };
    variables?: Record<string, VariableDefinition>;
}

export function VariableInspector() {
    const { activeEnvironment, getEnvironmentContent } = useEnvironmentStore();
    const [variables, setVariables] = useState<Record<string, VariableDefinition>>({});
    const [open, setOpen] = useState(false);
    const [showSecrets, setShowSecrets] = useState(false);

    // Reload variables when Popover opens or activeEnvironment changes
    useEffect(() => {
        if (open && activeEnvironment) {
            loadVariables();
        } else if (!activeEnvironment) {
            setVariables({});
        }
    }, [open, activeEnvironment]);

    // Reset secret visibility when closing
    useEffect(() => {
        if (!open) setShowSecrets(false);
    }, [open]);

    const loadVariables = async () => {
        if (!activeEnvironment) return;
        try {
            const content = await getEnvironmentContent(activeEnvironment.name, activeEnvironment.scope);
            const parsed = yaml.load(content) as EnvironmentFileV2 | undefined;
            if (parsed && typeof parsed === 'object' && parsed.variables) {
                setVariables(parsed.variables);
            } else {
                setVariables({});
            }
        } catch (e) {
            console.error("Failed to parse environment variables", e);
            setVariables({});
        }
    };

    const displayValue = (def: VariableDefinition): string => {
        if (def.sensitive && !showSecrets) return '••••••••';
        return def.value;
    };

    const entries = Object.entries(variables);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Environment Quick Look">
                    <Eye className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex flex-col max-h-[400px]">
                    <div className="px-4 py-3 border-b bg-muted/10 flex items-center justify-between">
                        <div className="min-w-0">
                            <h4 className="font-semibold text-sm">Environment</h4>
                            <p className="text-xs text-muted-foreground truncate">
                                {activeEnvironment
                                    ? `${activeEnvironment.name}.rd (${activeEnvironment.scope})`
                                    : 'No Environment Selected'}
                            </p>
                        </div>
                        {entries.some(([, v]) => v.sensitive) && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => setShowSecrets(!showSecrets)}
                                title={showSecrets ? 'Hide secrets' : 'Reveal secrets'}
                            >
                                {showSecrets
                                    ? <EyeOff className="h-3.5 w-3.5" />
                                    : <Eye className="h-3.5 w-3.5" />
                                }
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-2">
                        {!activeEnvironment ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                                Select an environment to see variables.
                            </div>
                        ) : entries.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                                No variables defined.
                            </div>
                        ) : (
                            <div className="border border-border/60 rounded-lg bg-background overflow-hidden relative">
                                <div className="grid grid-cols-[1fr_1.5fr] items-center bg-muted/40 text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-border/60 select-none">
                                    <div className="px-3 py-2 border-r border-border/40">Variable</div>
                                    <div className="px-3 py-2">Value</div>
                                </div>
                                <div className="max-h-[300px] overflow-auto bg-background">
                                    {entries.map(([key, def]) => (
                                        <div
                                            key={key}
                                            className="grid grid-cols-[1fr_1.5fr] items-center border-b border-border/40 last:border-0 hover:bg-muted/5 transition-colors group"
                                        >
                                            <div className="py-2 px-3 font-mono text-xs text-muted-foreground truncate border-r border-border/40" title={key}>
                                                {key}
                                            </div>
                                            <div
                                                className={cn(
                                                    "py-2 px-3 font-mono text-xs truncate",
                                                    def.sensitive && !showSecrets ? "text-muted-foreground/50" : "text-foreground"
                                                )}
                                                title={def.sensitive && !showSecrets ? 'Sensitive — click eye to reveal' : def.value}
                                            >
                                                {def.enabled === false ? (
                                                    <span className="line-through opacity-50">{displayValue(def)}</span>
                                                ) : (
                                                    displayValue(def)
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
