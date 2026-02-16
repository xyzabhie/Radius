import { Play, Save } from "lucide-react";
import { Button } from "../ui/button";
import { InputWithVariables } from "../ui/input-with-variables";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface AddressBarProps {
    method: string;
    url: string;
    onMethodChange: (method: string) => void;
    onUrlChange: (url: string) => void;
    onSend: () => void;
    onSave: () => void;
    loading?: boolean;
    onCancel?: () => void;
}

export function AddressBar({ method, url, onMethodChange, onUrlChange, onSend, onSave, loading, onCancel }: AddressBarProps) {
    // ... existing method color logic ...
    const getMethodColor = (m: string) => {
        switch (m.toUpperCase()) {
            case "GET": return "bg-method-get/15 text-method-get border-method-get/20 hover:bg-method-get/20";
            case "POST": return "bg-method-post/15 text-method-post border-method-post/20 hover:bg-method-post/20";
            case "PUT": return "bg-method-put/15 text-method-put border-method-put/20 hover:bg-method-put/20";
            case "DELETE": return "bg-method-delete/15 text-method-delete border-method-delete/20 hover:bg-method-delete/20";
            case "PATCH": return "bg-yellow-500/15 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20";
            default: return "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20";
        }
    };

    return (
        <div className="flex w-full items-center gap-2 px-6 h-14 shrink-0 bg-transparent z-10">
            <div className="flex-1 flex gap-2">
                <Select value={method} onValueChange={onMethodChange}>
                    <SelectTrigger className={`w-auto min-w-[75px] font-bold ${getMethodColor(method)} border ring-offset-0 focus:ring-1 focus:ring-ring/50`}>
                        <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="GET" className="font-bold text-method-get">GET</SelectItem>
                        <SelectItem value="POST" className="font-bold text-method-post">POST</SelectItem>
                        <SelectItem value="PUT" className="font-bold text-method-put">PUT</SelectItem>
                        <SelectItem value="PATCH" className="font-bold text-yellow-500">PATCH</SelectItem>
                        <SelectItem value="DELETE" className="font-bold text-method-delete">DELETE</SelectItem>
                    </SelectContent>
                </Select>

                <InputWithVariables
                    className="font-mono text-sm"
                    wrapperClassName="flex-1"
                    placeholder="{{baseUrl}}/api/v1/resource"
                    value={url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    onKeyDown={(e) => {
                        if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) || (e.key === 'e' && (e.ctrlKey || e.metaKey))) {
                            e.preventDefault();
                            onSend();
                        } else if (e.key === 'Enter' && !loading) {
                            onSend();
                        }
                    }}
                />
            </div>
            <div className="flex gap-2">
                <Button variant="secondary" onClick={onSave} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save
                </Button>
                {loading ? (
                    <Button onClick={onCancel} variant="destructive" className="w-24 gap-2">
                        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Stop
                    </Button>
                ) : (
                    <Button onClick={onSend} className="w-24 gap-2">
                        <Play className="h-4 w-4 fill-current" />
                        Send
                    </Button>
                )}
            </div>
        </div>
    );
}

