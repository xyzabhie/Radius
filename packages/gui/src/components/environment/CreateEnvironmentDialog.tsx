import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "@radix-ui/react-label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { toast } from "sonner";
import { Globe, FolderOpen } from "lucide-react";

interface CreateEnvironmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string, scope: 'global' | 'project') => Promise<void>;
    isProjectOpen: boolean;
}

export function CreateEnvironmentDialog({ open, onOpenChange, onCreate, isProjectOpen }: CreateEnvironmentDialogProps) {
    const [name, setName] = useState("");
    const [scope, setScope] = useState<'global' | 'project'>('global');
    const [isLoading, setIsLoading] = useState(false);

    // Reset scope based on project availability when dialog opens
    useEffect(() => {
        if (open) {
            setScope(isProjectOpen ? 'project' : 'global');
            setName("");
        }
    }, [open, isProjectOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!name.trim()) {
            toast.error("Environment name is required");
            return;
        }
        if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
            toast.error("Invalid name. Use letters, numbers, spaces, dashed, and underscores only.");
            return;
        }

        setIsLoading(true);
        try {
            await onCreate(name, scope);
            onOpenChange(false);
            toast.success(`${scope === 'global' ? 'Global' : 'Project'} environment created`);
        } catch (err) {
            toast.error("Failed to create environment");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Environment</DialogTitle>
                    <DialogDescription>
                        Create a new profile to store variables.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. production, staging"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Scope</Label>
                        <Select
                            value={scope}
                            onValueChange={(v) => setScope(v as 'global' | 'project')}
                            disabled={!isProjectOpen} // Force Global if no project
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select scope" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="global">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-muted-foreground" />
                                        <span>Global (User)</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="project" disabled={!isProjectOpen}>
                                    <div className="flex items-center gap-2">
                                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                        <span>Project (Workspace)</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[0.8rem] text-muted-foreground">
                            {scope === 'global'
                                ? "Available in all projects. Stored in your user profile."
                                : "Available only in this workspace. Stored in the project folder."}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
