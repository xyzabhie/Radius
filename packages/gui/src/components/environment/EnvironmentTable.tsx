import { Trash2, Eye, EyeOff, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { cn } from "../../lib/utils";
import { useState } from "react";

export interface EnvironmentTableItem {
    id: string;
    key: string;
    value: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
    sensitive: boolean;
    enabled: boolean;
}

interface EnvironmentTableProps {
    items: EnvironmentTableItem[];
    onChange: (items: EnvironmentTableItem[]) => void;
}

export function EnvironmentTable({ items, onChange }: EnvironmentTableProps) {
    const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

    const toggleSecretVisibility = (id: string) => {
        setVisibleSecrets(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleChange = (id: string, field: keyof EnvironmentTableItem, value: any) => {
        const newItems = items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );

        // Auto-add new row if last row is modified
        const lastItem = newItems[newItems.length - 1];
        if (lastItem && (lastItem.key || lastItem.value || lastItem.description)) {
            newItems.push({
                id: crypto.randomUUID(),
                key: "",
                value: "",
                type: 'string',
                description: "",
                sensitive: false,
                enabled: true
            });
        }

        onChange(newItems);
    };

    const handleDelete = (id: string) => {
        let newItems = items.filter(item => item.id !== id);

        if (newItems.length === 0) {
            newItems = [{
                id: crypto.randomUUID(),
                key: "",
                value: "",
                type: 'string',
                description: "",
                sensitive: false,
                enabled: true
            }];
        }

        onChange(newItems);
    };

    const gridTemplate = "36px 1.5fr 112px 2fr 2fr 64px 36px";

    return (
        <div className="flex flex-col flex-1 border border-border/60 rounded-lg w-full bg-card overflow-hidden relative min-h-0">
            {/* Header Row */}
            <div
                className="grid items-center bg-muted/60 text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-border/60 select-none"
                style={{ gridTemplateColumns: gridTemplate }}
            >
                <div className="text-center py-2.5 border-r border-border/40 h-full flex items-center justify-center"></div>
                <div className="px-4 py-2.5 border-r border-border/40 h-full flex items-center">Variable</div>
                <div className="px-4 py-2.5 border-r border-border/40 h-full flex items-center">Type</div>
                <div className="px-4 py-2.5 border-r border-border/40 h-full flex items-center">Value</div>
                <div className="px-4 py-2.5 border-r border-border/40 h-full flex items-center">Description</div>
                <div className="text-center py-2.5 border-r border-border/40 h-full flex items-center justify-center">Secret</div>
                <div className="flex items-center justify-center h-full">
                    <button
                        onClick={() => {
                            const newItems = [...items, {
                                id: crypto.randomUUID(),
                                key: "",
                                value: "",
                                type: 'string' as const,
                                description: "",
                                sensitive: false,
                                enabled: true
                            }];
                            onChange(newItems);
                        }}
                        title="Add Variable"
                        className="p-1.5 rounded-md hover:bg-primary/20 hover:text-primary transition-all text-muted-foreground"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Rows - Scrollable Area */}
            <div className="flex-1 overflow-auto no-scrollbar min-h-0 bg-muted/5">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={cn(
                            "grid items-center group border-b border-border/40 last:border-0 hover:bg-muted/5 transition-colors",
                            !item.enabled && "opacity-60"
                        )}
                        style={{ gridTemplateColumns: gridTemplate }}
                    >
                        {/* Checkbox */}
                        <div className="flex justify-center py-1 border-r border-border/40 h-full items-center">
                            <Checkbox
                                checked={item.enabled}
                                onCheckedChange={(c) => handleChange(item.id, 'enabled', c === true)}
                                className="h-4 w-4 rounded-sm border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                        </div>

                        {/* Key */}
                        <div className="p-0 border-r border-border/40 h-full">
                            <Input
                                className={cn(
                                    "h-10 border-0 rounded-none focus-visible:ring-0 focus-visible:bg-muted/10 px-4 font-mono text-sm bg-transparent placeholder:text-muted-foreground/40 w-full shadow-none",
                                    !item.enabled && "line-through text-muted-foreground"
                                )}
                                placeholder="Variable"
                                value={item.key}
                                onChange={(e) => handleChange(item.id, 'key', e.target.value)}
                            />
                        </div>

                        {/* Type */}
                        <div className="p-0 border-r border-border/40 h-full">
                            <Select
                                value={item.type}
                                onValueChange={(v) => handleChange(item.id, 'type', v)}
                                disabled={!item.enabled}
                            >
                                <SelectTrigger className="h-10 border-0 rounded-none focus:ring-0 shadow-none px-4 font-mono text-xs text-muted-foreground hover:bg-muted/5 bg-transparent w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Value */}
                        <div className="p-0 border-r border-border/40 relative flex items-center h-full">
                            <Input
                                className={cn(
                                    "h-10 border-0 rounded-none focus-visible:ring-0 focus-visible:bg-muted/10 px-4 font-mono text-sm pr-9 bg-transparent placeholder:text-muted-foreground/40 w-full shadow-none",
                                    item.sensitive && !visibleSecrets[item.id] ? "text-muted-foreground" : "",
                                    !item.enabled && "line-through text-muted-foreground"
                                )}
                                placeholder="Value"
                                type={item.sensitive && !visibleSecrets[item.id] ? "password" : "text"}
                                value={item.value}
                                onChange={(e) => handleChange(item.id, 'value', e.target.value)}
                            />
                            {/* Show/Hide Secret Toggle */}
                            {item.sensitive && (
                                <button
                                    className="absolute right-2.5 opacity-40 hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                                    onClick={() => toggleSecretVisibility(item.id)}
                                >
                                    {visibleSecrets[item.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                            )}
                        </div>

                        {/* Description */}
                        <div className="p-0 border-r border-border/40 h-full">
                            <Input
                                className={cn(
                                    "h-10 border-0 rounded-none focus-visible:ring-0 focus-visible:bg-muted/10 px-4 text-sm text-muted-foreground bg-transparent placeholder:text-muted-foreground/40 w-full shadow-none",
                                    !item.enabled && "line-through opacity-80"
                                )}
                                placeholder="Description"
                                value={item.description}
                                onChange={(e) => handleChange(item.id, 'description', e.target.value)}
                            />
                        </div>

                        {/* Secret Toggle */}
                        <div className="flex justify-center py-1 border-r border-border/40 h-full items-center">
                            <Checkbox
                                checked={item.sensitive}
                                onCheckedChange={(c) => handleChange(item.id, 'sensitive', c === true)}
                                disabled={!item.enabled}
                                className="h-4 w-4 rounded-sm border-muted-foreground/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                            />
                        </div>

                        {/* Delete Action */}
                        <div className="flex justify-center py-1 h-full items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => handleDelete(item.id)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
