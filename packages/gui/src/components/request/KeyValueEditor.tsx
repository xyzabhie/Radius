import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { KeyValueItem } from "./types";

interface KeyValueEditorProps {
    items: KeyValueItem[];
    onChange: (items: KeyValueItem[]) => void;
    title?: string;
}

export function KeyValueEditor({ items, onChange, title }: KeyValueEditorProps) {
    const handleChange = (id: string, field: keyof KeyValueItem, value: string | boolean) => {
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
                description: "",
                enabled: true
            });
        }

        onChange(newItems);
    };

    const handleDelete = (id: string) => {
        // Don't delete if it's the only (empty) row, or just clear it?
        // Standard behavior: Delete row. If list becomes empty, add one empty row.
        let newItems = items.filter(item => item.id !== id);

        if (newItems.length === 0) {
            newItems = [{
                id: crypto.randomUUID(),
                key: "",
                value: "",
                description: "",
                enabled: true
            }];
        }

        onChange(newItems);
    };

    return (
        <div className="flex flex-col gap-2 w-full">
            {title && <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>}

            <div className="flex flex-col border rounded-md">
                {/* Header Row */}
                <div className="flex items-center bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                    <div className="w-9 text-center py-2 border-r"></div>
                    <div className="flex-1 px-3 py-2 border-r">Key</div>
                    <div className="flex-1 px-3 py-2 border-r">Value</div>
                    <div className="flex-1 px-3 py-2">Description</div>
                    <div className="w-9 py-2"></div>
                </div>

                {/* Rows */}
                {items.map((item) => (
                    <div key={item.id} className="flex items-center group border-b last:border-0 hover:bg-muted/5">
                        <div className="w-9 flex justify-center py-1 border-r">
                            <Checkbox
                                checked={item.enabled}
                                onCheckedChange={(c) => handleChange(item.id, 'enabled', c === true)}
                            />
                        </div>
                        <div className="flex-1 p-0 border-r">
                            <Input
                                className="h-9 border-0 rounded-none focus-visible:ring-0 focus-visible:bg-muted/10 px-3 font-mono text-sm"
                                placeholder="Key"
                                value={item.key}
                                onChange={(e) => handleChange(item.id, 'key', e.target.value)}
                            />
                        </div>
                        <div className="flex-1 p-0 border-r">
                            <Input
                                className="h-9 border-0 rounded-none focus-visible:ring-0 focus-visible:bg-muted/10 px-3 font-mono text-sm"
                                placeholder="Value"
                                value={item.value}
                                onChange={(e) => handleChange(item.id, 'value', e.target.value)}
                            />
                        </div>
                        <div className="flex-1 p-0">
                            <Input
                                className="h-9 border-0 rounded-none focus-visible:ring-0 focus-visible:bg-muted/10 px-3 text-sm text-muted-foreground"
                                placeholder="Description"
                                value={item.description}
                                onChange={(e) => handleChange(item.id, 'description', e.target.value)}
                            />
                        </div>
                        <div className="w-9 flex justify-center py-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDelete(item.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
