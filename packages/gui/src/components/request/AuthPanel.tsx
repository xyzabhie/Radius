import { AuthConfig, AuthType } from "./types";
import { Eye, EyeOff, Check } from "lucide-react";
import { useState, memo } from "react"; // ADD memo
import { cn } from "../../lib/utils";
import { InputWithVariables } from "../ui/input-with-variables";

interface AuthPanelProps {
    auth: AuthConfig;
    onChange: (auth: AuthConfig) => void;
}

export const AuthPanel = memo(function AuthPanel({ auth, onChange }: AuthPanelProps) {
    const [showPassword, setShowPassword] = useState(false);

    const handleTypeChange = (type: AuthType) => {
        onChange({ ...auth, type });
    };

    const handleUpdate = (updates: Partial<AuthConfig>) => {
        onChange({ ...auth, ...updates });
    };

    const AuthTypes: { id: AuthType, label: string }[] = [
        { id: 'none', label: 'None' },
        { id: 'bearer', label: 'Bearer Token' },
        { id: 'basic', label: 'Basic Auth' },
        { id: 'api-key', label: 'API Key' },
    ];

    return (
        <div className="flex flex-col h-full bg-background font-sans">
            {/* Auth Type Selector - Top Bar */}
            <div className="flex items-center px-6 py-4 border-b border-border/10 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
                <span className="text-muted-foreground mr-6 text-xs font-bold uppercase tracking-widest opacity-70">Auth Type</span>
                <div className="flex gap-1 p-1 bg-muted/40 rounded-lg">
                    {AuthTypes.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => handleTypeChange(type.id)}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out",
                                auth.type === type.id
                                    ? "bg-background shadow-sm text-foreground ring-1 ring-border/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area - Standard Sizing */}
            <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-2xl mx-auto">
                    {auth.type === 'none' && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50 space-y-4 animate-in fade-in zoom-in-95 duration-500">
                            <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center ring-1 ring-border/10">
                                <Check className="h-8 w-8 opacity-40" />
                            </div>
                            <div className="text-center">
                                <h3 className="font-medium text-sm text-foreground opacity-80">No Authentication</h3>
                                <p className="text-xs">This request is public.</p>
                            </div>
                        </div>
                    )}

                    {auth.type === 'bearer' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300 fade-in">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Bearer Token</label>
                                <div className="relative group">
                                    <InputWithVariables
                                        type="text"
                                        placeholder="Paste your token here..."
                                        value={auth.token || ''}
                                        onChange={(e) => handleUpdate({ token: e.target.value })}
                                        className="w-full h-10 bg-muted/10 hover:bg-muted/20 focus:bg-muted/20 border border-border/40 focus:border-primary/50 rounded-md px-3 text-sm outline-none transition-all placeholder:text-muted-foreground/30 font-mono"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground pl-1 opacity-70">
                                    Added to <code className="bg-muted/50 px-1.5 py-0.5 rounded text-foreground text-[11px]">Authorization</code> header.
                                </p>
                            </div>
                        </div>
                    )}

                    {auth.type === 'basic' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300 fade-in">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Username</label>
                                    <InputWithVariables
                                        type="text"
                                        placeholder="Username"
                                        value={auth.username || ''}
                                        onChange={(e) => handleUpdate({ username: e.target.value })}
                                        className="w-full h-10 bg-muted/10 hover:bg-muted/20 focus:bg-muted/20 border border-border/40 focus:border-primary/50 rounded-md px-3 text-sm outline-none transition-all placeholder:text-muted-foreground/30"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Password</label>
                                    <div className="relative">
                                        <InputWithVariables
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Password"
                                            value={auth.password || ''}
                                            onChange={(e) => handleUpdate({ password: e.target.value })}
                                            className="w-full h-10 bg-muted/10 hover:bg-muted/20 focus:bg-muted/20 border border-border/40 focus:border-primary/50 rounded-md px-3 text-sm outline-none transition-all placeholder:text-muted-foreground/30 pr-10"
                                            wrapperClassName="w-full"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-2 top-2 text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted z-10"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground pl-1 opacity-70">
                                Base64 encoded in <code className="bg-muted/50 px-1.5 py-0.5 rounded text-foreground text-[11px]">Authorization</code> header.
                            </p>
                        </div>
                    )}

                    {auth.type === 'api-key' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300 fade-in">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Key</label>
                                    <InputWithVariables
                                        type="text"
                                        placeholder="e.g. X-API-Key"
                                        value={auth.key || ''}
                                        onChange={(e) => handleUpdate({ key: e.target.value })}
                                        className="w-full h-10 bg-muted/10 hover:bg-muted/20 focus:bg-muted/20 border border-border/40 focus:border-primary/50 rounded-md px-3 text-sm outline-none transition-all placeholder:text-muted-foreground/30 font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Value</label>
                                    <div className="relative">
                                        <InputWithVariables
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Value"
                                            value={auth.value || ''}
                                            onChange={(e) => handleUpdate({ value: e.target.value })}
                                            className="w-full h-10 bg-muted/10 hover:bg-muted/20 focus:bg-muted/20 border border-border/40 focus:border-primary/50 rounded-md px-3 text-sm outline-none transition-all placeholder:text-muted-foreground/30 font-mono pr-10"
                                            wrapperClassName="w-full"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-2 top-2 text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted z-10"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Add To</label>
                                <div className="flex gap-4">
                                    <div
                                        onClick={() => handleUpdate({ in: 'header' })}
                                        className={cn(
                                            "flex items-center gap-3 cursor-pointer px-4 py-2 rounded-md border transition-all duration-200 flex-1 h-10",
                                            (auth.in === 'header' || !auth.in)
                                                ? "border-primary/30 bg-primary/5 ring-1 ring-primary/5"
                                                : "border-border/20 bg-transparent hover:bg-muted/30 hover:border-border/30"
                                        )}>
                                        <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", (auth.in === 'header' || !auth.in) ? "border-primary" : "border-muted-foreground/40")}>
                                            {(auth.in === 'header' || !auth.in) && <div className="w-2 h-2 rounded-full bg-primary" />}
                                        </div>
                                        <div>
                                            <span className={cn("text-xs font-medium block", (auth.in === 'header' || !auth.in) ? "text-foreground" : "text-muted-foreground")}>Header</span>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => handleUpdate({ in: 'query' })}
                                        className={cn(
                                            "flex items-center gap-3 cursor-pointer px-4 py-2 rounded-md border transition-all duration-200 flex-1 h-10",
                                            auth.in === 'query'
                                                ? "border-primary/30 bg-primary/5 ring-1 ring-primary/5"
                                                : "border-border/20 bg-transparent hover:bg-muted/30 hover:border-border/30"
                                        )}>
                                        <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", auth.in === 'query' ? "border-primary" : "border-muted-foreground/40")}>
                                            {auth.in === 'query' && <div className="w-2 h-2 rounded-full bg-primary" />}
                                        </div>
                                        <div>
                                            <span className={cn("text-xs font-medium block", auth.in === 'query' ? "text-foreground" : "text-muted-foreground")}>Query Params</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
