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

interface CreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    placeholder?: string;
    confirmText?: string;
    onConfirm: (value: string) => Promise<void>;
}

export function CreateDialog({
    open,
    onOpenChange,
    title,
    placeholder = "Name",
    confirmText = "Create",
    onConfirm,
}: CreateDialogProps) {
    const [value, setValue] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setValue("");
            setIsSubmitting(false);
        }
    }, [open]);

    const handleConfirm = async () => {
        if (!value.trim()) return;

        try {
            setIsSubmitting(true);
            await onConfirm(value.trim());
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
                        Enter a name for the new item.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                        autoFocus
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting || !value.trim()}>
                        {isSubmitting ? "Creating..." : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
