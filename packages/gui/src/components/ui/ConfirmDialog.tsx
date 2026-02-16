import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    alternateText?: string;
    variant?: "default" | "destructive";
    onConfirm: () => void;
    onCancel: () => void;
    onAlternate?: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    alternateText,
    variant = "default",
    onConfirm,
    onCancel,
    onAlternate,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onCancel();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={dialogRef}
                className={cn(
                    "relative grid w-full max-w-md gap-4 border bg-background p-6 shadow-lg sm:rounded-lg md:w-full animate-in zoom-in-95 duration-200"
                )}
            >
                <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                    <h2 className="text-lg font-semibold leading-none tracking-tight">
                        {title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                    <Button variant="outline" onClick={onCancel}>
                        {cancelText}
                    </Button>
                    {onAlternate && alternateText && (
                        <Button variant="secondary" onClick={onAlternate}>
                            {alternateText}
                        </Button>
                    )}
                    <Button
                        variant={variant === "destructive" ? "destructive" : "default"}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </Button>
                </div>

                <button
                    onClick={onCancel}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>
    );
}
