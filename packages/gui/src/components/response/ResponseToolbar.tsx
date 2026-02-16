import { useMemo, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Copy, Download, Eye, FileJson, FileType, ChevronDown, ChevronUp, WrapText, Check, GripHorizontal } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";
import { RadiusResponse } from "@radius/core";

export type ViewMode = 'pretty' | 'raw' | 'preview';

interface ResponseToolbarProps {
    response: RadiusResponse | null;
    loading: boolean;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    lineWrap: boolean;
    setLineWrap: (wrap: boolean) => void;
    onCopy: () => void;
    onSave: () => void;
    onToggleMinimize?: () => void;
    isMinimized?: boolean;
}

/** Status badge color by HTTP status range */
function getStatusStyle(status: number): string {
    if (status >= 200 && status < 300) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
    if (status >= 300 && status < 400) return "bg-sky-500/15 text-sky-400 border-sky-500/25";
    if (status >= 400 && status < 500) return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    return "bg-red-500/15 text-red-400 border-red-500/25";
}

/** Timing color — green for fast, amber for medium, red for slow */
function getTimingColor(ms: number): string {
    if (ms < 200) return "text-emerald-400";
    if (ms < 1000) return "text-amber-400";
    return "text-red-400";
}

/** Compact view mode toggle */
const viewBtnBase = "px-3 py-1 text-xs uppercase font-semibold rounded transition-all flex items-center gap-1.5 cursor-pointer";
const viewBtnActive = "bg-primary/15 text-primary";
const viewBtnInactive = "text-muted-foreground hover:text-foreground hover:bg-muted/30";

export function ResponseToolbar({
    response,
    loading,
    viewMode,
    setViewMode,
    lineWrap,
    setLineWrap,
    onCopy,
    onSave,
    onToggleMinimize,
    isMinimized
}: ResponseToolbarProps) {
    const [copied, setCopied] = useState(false);

    const sizeDisplay = useMemo(() => {
        if (!response?.body) return null;
        const len = response.body.length;
        if (len > 1048576) return `${(len / 1048576).toFixed(1)} MB`;
        if (len > 1024) return `${(len / 1024).toFixed(1)} KB`;
        return `${len} B`;
    }, [response?.body]);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation(); // Don't trigger resize
        onCopy();
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleButtonClick = (e: React.MouseEvent, fn: () => void) => {
        e.stopPropagation();
        fn();
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div
                className="response-handle-toolbar relative z-10 flex items-center justify-between w-full h-full px-4 select-none"
                onMouseDown={(e) => {
                    // Allow drag only on empty areas, not on buttons
                    if ((e.target as HTMLElement).closest('button')) {
                        e.stopPropagation();
                    }
                }}
            >
                {/* Left: Label + Metrics */}
                <div className="flex items-center gap-3 min-w-0">
                    {/* Drag grip + label */}
                    <div className="flex items-center gap-2.5 text-muted-foreground/80">
                        <GripHorizontal className="w-4 h-4 shrink-0 opacity-50" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] shrink-0 text-foreground/80">
                            Response
                        </span>
                    </div>

                    {/* Loading indicator */}
                    {loading && (
                        <div className="flex items-center gap-1 ml-2">
                            <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                            <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                        </div>
                    )}

                    {/* Response metrics */}
                    {response && !loading && (
                        <div className="flex items-center gap-3 ml-2 animate-in fade-in slide-in-from-left-1 duration-200">
                            {/* Status badge */}
                            <span className={cn(
                                "px-2 py-0.5 rounded-md text-xs font-bold tabular-nums border",
                                getStatusStyle(response.status)
                            )}>
                                {response.status}
                            </span>

                            {/* Divider */}
                            <div className="w-px h-4 bg-border/30" />

                            {/* Timing */}
                            <span className={cn(
                                "text-xs font-medium tabular-nums",
                                getTimingColor(response.timing.total)
                            )}>
                                {response.timing.total < 1000
                                    ? `${response.timing.total.toFixed(0)}ms`
                                    : `${(response.timing.total / 1000).toFixed(2)}s`
                                }
                            </span>

                            {/* Size */}
                            {sizeDisplay && (
                                <span className="text-xs font-medium text-muted-foreground tabular-nums cursor-default">
                                    {sizeDisplay}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-1 shrink-0">
                    {response && !loading && (
                        <>
                            {/* View mode toggle group */}
                            <div className="flex items-center bg-muted/40 rounded-lg p-1 mr-2">
                                <button
                                    onClick={(e) => handleButtonClick(e, () => setViewMode('pretty'))}
                                    className={cn(viewBtnBase, viewMode === 'pretty' ? viewBtnActive : viewBtnInactive)}
                                >
                                    <FileJson className="w-3.5 h-3.5" /> Pretty
                                </button>
                                <button
                                    onClick={(e) => handleButtonClick(e, () => setViewMode('raw'))}
                                    className={cn(viewBtnBase, viewMode === 'raw' ? viewBtnActive : viewBtnInactive)}
                                >
                                    <FileType className="w-3.5 h-3.5" /> Raw
                                </button>
                                <button
                                    onClick={(e) => handleButtonClick(e, () => setViewMode('preview'))}
                                    className={cn(viewBtnBase, viewMode === 'preview' ? viewBtnActive : viewBtnInactive)}
                                >
                                    <Eye className="w-3.5 h-3.5" /> Preview
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-5 bg-border/20 mx-1" />

                            {/* Action buttons */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn("h-8 w-8 rounded-md cursor-pointer", lineWrap ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/40")}
                                        onClick={(e) => handleButtonClick(e, () => setLineWrap(!lineWrap))}
                                    >
                                        <WrapText className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">Word Wrap</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-md cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                        onClick={handleCopy}
                                    >
                                        {copied
                                            ? <Check className="w-4 h-4 text-emerald-400" />
                                            : <Copy className="w-4 h-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">{copied ? 'Copied!' : 'Copy'}</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-md cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                        onClick={(e) => handleButtonClick(e, onSave)}
                                    >
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">Download</TooltipContent>
                            </Tooltip>
                        </>
                    )}

                    {/* Collapse/Expand — always visible */}
                    {onToggleMinimize && (
                        <>
                            <div className="w-px h-5 bg-border/20 mx-1" />
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-md cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                        onClick={(e) => handleButtonClick(e, onToggleMinimize)}
                                    >
                                        {isMinimized
                                            ? <ChevronUp className="w-4 h-4" />
                                            : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    {isMinimized ? 'Expand' : 'Collapse'}
                                </TooltipContent>
                            </Tooltip>
                        </>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
