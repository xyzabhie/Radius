import { useState, Suspense, lazy } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from "../../lib/utils";
import { FormDataEditor } from "./FormDataEditor";
import { KeyValueItem } from "./types";

// Lazy load heavy editors
const BinaryEditor = lazy(() => import('./body/BinaryEditor').then(m => ({ default: m.BinaryEditor })));
const GraphQLEditor = lazy(() => import('./body/GraphQLEditor').then(m => ({ default: m.GraphQLEditor })));
const RawEditor = lazy(() => import('./body/RawEditor').then(m => ({ default: m.RawEditor })));

interface BodyEditorProps {
    content: string;
    onChange: (content: string) => void;
    mode: 'none' | 'form-data' | 'urlencoded' | 'binary' | 'graphql' | 'json' | 'text' | 'xml' | 'html';
    onModeChange: (mode: 'none' | 'form-data' | 'urlencoded' | 'binary' | 'graphql' | 'json' | 'text' | 'xml' | 'html') => void;

    // Form Data Props
    formData?: KeyValueItem[];
    onFormDataChange?: (items: KeyValueItem[]) => void;
    urlEncoded?: KeyValueItem[];
    onUrlEncodedChange?: (items: KeyValueItem[]) => void;
    binaryFilePath?: string;
    onBinaryChange?: (path: string) => void;
    onRun?: () => void;
}

export function BodyEditor({
    content, onChange, mode, onModeChange,
    formData = [], onFormDataChange = () => { },
    urlEncoded = [], onUrlEncodedChange = () => { },
    binaryFilePath = '', onBinaryChange = () => { },
    onRun
}: BodyEditorProps) {
    const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);


    const isRaw = mode === 'json' || mode === 'text' || mode === 'xml' || mode === 'html';

    const handleRawLanguageChange = (lang: string) => {
        onModeChange(lang as any);
    };

    const handleBeautify = () => {
        try {
            const formatted = JSON.stringify(JSON.parse(content), null, 2);
            onChange(formatted);
            setStatus({ type: 'success', message: 'JSON formatted successfully' });
            setTimeout(() => setStatus(null), 3000); // Auto hide success after 3s
        } catch (e) {
            setStatus({ type: 'error', message: 'Invalid JSON: ' + (e as Error).message });

        }
    };

    const renderEditor = () => {
        if (mode === 'none') {
            return (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                    This request has no body
                </div>
            );
        }

        if (mode === 'form-data' || mode === 'urlencoded') {
            return (
                <FormDataEditor
                    items={mode === 'form-data' ? formData : urlEncoded}
                    onChange={mode === 'form-data' ? onFormDataChange : onUrlEncodedChange}
                />
            );
        }

        return (
            <Suspense fallback={
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                    Loading Editor...
                </div>
            }>
                {mode === 'binary' && <BinaryEditor content={binaryFilePath} onChange={onBinaryChange} />}
                {mode === 'graphql' && <GraphQLEditor content={content} onChange={onChange} onRun={onRun} />}
                {isRaw && <RawEditor content={content} onChange={onChange} mode={mode} onRun={onRun} />}
            </Suspense>
        );
    }

    return (
        <div className="flex flex-col h-full relative font-sans">
            {/* Toolbar */}
            {/* Toolbar */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-border/10 bg-transparent backdrop-blur-sm sticky top-0 z-10 w-full overflow-hidden">
                <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg overflow-x-auto no-scrollbar mask-gradient-r">
                    {[
                        { id: 'none', label: 'None' },
                        { id: 'form-data', label: 'Form Data' },
                        { id: 'urlencoded', label: 'Url Encoded' },
                        { id: 'json', label: 'Raw', active: isRaw, onClick: () => onModeChange('json') }, // "Raw" activates JSON by default
                        { id: 'binary', label: 'Binary' },
                        { id: 'graphql', label: 'GraphQL' },
                    ].map((item) => {
                        const isActive = item.active !== undefined ? item.active : mode === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={item.onClick || (() => onModeChange(item.id as any))}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ease-in-out whitespace-nowrap",
                                    isActive
                                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/10"
                                        : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-background/30"
                                )}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                {isRaw && (
                    <div className="ml-auto flex items-center gap-3 pl-4 border-l border-border/10">
                        {mode === 'json' && (
                            <button
                                onClick={handleBeautify}
                                className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-primary transition-colors"
                            >
                                Beautify
                            </button>
                        )}
                        <Select value={mode} onValueChange={handleRawLanguageChange}>
                            <SelectTrigger className="w-[70px] h-6 text-xs border-none bg-transparent hover:bg-muted/50 focus:ring-0 p-0 text-foreground/80 font-medium">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="json">JSON</SelectItem>
                                <SelectItem value="xml">XML</SelectItem>
                                <SelectItem value="html">HTML</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden relative bg-transparent">
                {renderEditor()}
            </div>

            {/* Inline Status Bar */}
            {status && (
                <div className={cn(
                    "absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-medium shadow-lg backdrop-blur-md border animate-in slide-in-from-bottom-2 fade-in duration-300 z-50 flex items-center gap-3",
                    status.type === 'error'
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                )}>
                    <span>{status.message}</span>
                </div>
            )}
        </div>
    );
}
