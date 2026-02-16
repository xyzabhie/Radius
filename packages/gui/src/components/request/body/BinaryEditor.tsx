import { FileUp, FolderOpen } from 'lucide-react';
import { Button } from '../../ui/button';
import { open } from '@tauri-apps/plugin-dialog';

interface BinaryEditorProps {
    content: string;
    onChange: (content: string) => void;
}

export function BinaryEditor({ content, onChange }: BinaryEditorProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-sm p-8">
            <div className="border border-dashed border-border/40 rounded-lg p-10 flex flex-col items-center gap-4 bg-muted/5 w-full max-w-md">
                <div className="p-4 bg-muted/20 rounded-full">
                    <FileUp className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <div className="text-center space-y-1">
                    <h3 className="font-medium">
                        {content ? "File Selected" : "Select a file"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {content ? content : "Choose a file to send as binary body"}
                    </p>
                </div>
                <Button
                    variant={content ? "secondary" : "default"}
                    onClick={async () => {
                        try {
                            const selected = await open({
                                multiple: false,
                            });
                            if (selected && typeof selected === 'string') {
                                onChange(selected);
                            }
                        } catch (err) {
                            console.error("Failed to open file", err);
                        }
                    }}
                    className="gap-2"
                >
                    <FolderOpen className="h-4 w-4" />
                    {content ? "Change File" : "Browse File"}
                </Button>
                {content && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onChange('')}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                    >
                        Remove
                    </Button>
                )}
            </div>
        </div>
    );
}
