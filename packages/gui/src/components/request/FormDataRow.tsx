import { Trash2 } from "lucide-react";
import { memo } from "react";
import { KeyValueItem } from "./types";
import { cn } from "../../lib/utils";
import { InputWithVariables } from "../ui/input-with-variables";

interface FormDataRowProps {
    item: KeyValueItem;
    onUpdate: (id: string, updates: Partial<KeyValueItem>) => void;
    onDelete: (id: string) => void;
    gridTemplate?: string;
}

export const FormDataRow = memo(({ item, onUpdate, onDelete, gridTemplate = "36px 1fr 1fr 1fr 36px" }: FormDataRowProps) => {
    return (
        <div
            className={cn(
                "group grid items-center border-b border-border/40 last:border-0 hover:bg-muted/5 transition-colors",
                !item.enabled && "opacity-60"
            )}
            style={{ gridTemplateColumns: gridTemplate }}
        >
            {/* Checkbox */}
            <div className="flex justify-center py-1 border-r border-border/40 h-full items-center">
                <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => onUpdate(item.id, { enabled: e.target.checked })}
                    className="accent-primary h-3.5 w-3.5"
                />
            </div>

            {/* Key Input */}
            <div className="p-0 border-r border-border/40 h-full">
                <InputWithVariables
                    type="text"
                    value={item.key}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate(item.id, { key: e.target.value })}
                    placeholder="Key"
                    wrapperClassName="w-full h-full"
                    className={cn(
                        "h-10 border-0 rounded-none focus-visible:ring-0 focus-visible:bg-muted/10 px-4 font-mono text-sm bg-muted/5 placeholder:text-muted-foreground/40 w-full shadow-none",
                        !item.enabled && "line-through text-muted-foreground"
                    )}
                />
            </div>

            {/* Value Input */}
            <div className="p-0 border-r border-border/40 h-full">
                <InputWithVariables
                    type="text"
                    value={item.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate(item.id, { value: e.target.value })}
                    placeholder="Value"
                    wrapperClassName="w-full h-full"
                    className={cn(
                        "h-10 border-0 rounded-none focus-visible:ring-0 focus-visible:bg-muted/10 px-4 font-mono text-sm bg-muted/5 placeholder:text-muted-foreground/40 w-full shadow-none",
                        !item.enabled && "line-through text-muted-foreground"
                    )}
                />
            </div>

            {/* Description Input */}
            <div className="p-0 border-r border-border/40 h-full">
                <input
                    type="text"
                    value={item.description || ''}
                    onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                    placeholder="Description"
                    className={cn(
                        "h-10 border-0 rounded-none focus-visible:ring-0 focus-visible:bg-muted/10 px-4 text-sm text-muted-foreground bg-muted/5 placeholder:text-muted-foreground/40 w-full outline-none transition-all",
                        !item.enabled && "line-through opacity-80"
                    )}
                />
            </div>

            {/* Actions */}
            <div className="flex justify-center py-1 h-full items-center">
                <button
                    onClick={() => onDelete(item.id)}
                    className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}, (prev, next) => {
    // Custom comparison to ensure strict equality check on item properties
    // This is optional if KeyValueItem is immutable, but safer to be explicit
    return (
        prev.item.key === next.item.key &&
        prev.item.value === next.item.value &&
        prev.item.description === next.item.description &&
        prev.item.enabled === next.item.enabled &&
        prev.item.id === next.item.id
        // Note: functions (onUpdate/onDelete) must be stable across renders!
    );
});

FormDataRow.displayName = "FormDataRow";
