import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";

interface RenameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialValue: string;
    onConfirm: (newValue: string) => Promise<void>;
    title?: string;
}

export function RenameDialog({
    open,
    onOpenChange,
    initialValue,
    onConfirm,
    title = "Rename Item",
}: RenameDialogProps) {
    const [value, setValue] = useState(initialValue);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setValue(initialValue);
            setIsSubmitting(false);
        }
    }, [open, initialValue]);

    const handleConfirm = async () => {
        if (!value || value === initialValue) {
            onOpenChange(false);
            return;
        }

        try {
            setIsSubmitting(true);
            await onConfirm(value);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Enter a new name for this item.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Name"
                        onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                        autoFocus
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting || !value.trim()}>
                        {isSubmitting ? "Renaming..." : "Rename"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
