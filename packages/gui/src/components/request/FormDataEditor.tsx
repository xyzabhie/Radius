import { Plus } from "lucide-react";
import { useCallback } from "react";
import { KeyValueItem } from "./types";
import { FormDataRow } from "./FormDataRow";

interface FormDataEditorProps {
    items: KeyValueItem[];
    onChange: (items: KeyValueItem[]) => void;
}

export function FormDataEditor({ items, onChange }: FormDataEditorProps) {
    // Memoize handlers to ensure they are stable references for React.memo in rows
    const handleUpdate = useCallback((id: string, updates: Partial<KeyValueItem>) => {
        onChange(items.map(item => item.id === id ? { ...item, ...updates } : item));
    }, [items, onChange]);

    const handleDelete = useCallback((id: string) => {
        onChange(items.filter(item => item.id !== id));
    }, [items, onChange]);

    const handleAdd = useCallback(() => {
        onChange([
            ...items,
            { id: crypto.randomUUID(), key: '', value: '', description: '', enabled: true }
        ]);
    }, [items, onChange]);

    const gridTemplate = "36px 1fr 1fr 1fr 36px";

    return (
        <div className="flex flex-col h-full w-full p-2">
            <div className="flex flex-col flex-1 min-h-0 border border-border/60 rounded-lg bg-background overflow-hidden relative">
                {/* Header */}
                <div
                    className="grid items-center bg-muted/60 text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-border/60 select-none"
                    style={{ gridTemplateColumns: gridTemplate }}
                >
                    <div className="text-center py-2.5 border-r border-border/40 h-full flex items-center justify-center"></div>
                    <div className="px-4 py-2.5 border-r border-border/40 h-full flex items-center">Key</div>
                    <div className="px-4 py-2.5 border-r border-border/40 h-full flex items-center">Value</div>
                    <div className="px-4 py-2.5 border-r border-border/40 h-full flex items-center">Description</div>
                    <div className="flex items-center justify-center h-full">
                        <button
                            onClick={handleAdd}
                            title="Add Item"
                            className="p-1.5 rounded-md hover:bg-primary/20 hover:text-primary transition-all text-muted-foreground"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* List - The scrollable area */}
                <div className="flex-1 overflow-auto bg-muted/20 min-h-0 no-scrollbar">
                    {items.map((item) => (
                        <FormDataRow
                            key={item.id}
                            item={item}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            gridTemplate={gridTemplate}
                        />
                    ))}

                    {/* Empty State */}
                    {items.length === 0 && (
                        <div className="p-8 text-center">
                            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-widest font-bold opacity-40">No items defined</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
