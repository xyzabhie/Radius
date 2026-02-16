import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface ResponseHeadersProps {
    headers: Record<string, string>;
}

export function ResponseHeaders({ headers }: ResponseHeadersProps) {
    const [headerFilter, setHeaderFilter] = useState('');

    const filteredHeaders = useMemo(() => {
        const entries = Object.entries(headers);
        if (!headerFilter) return entries;
        const lowerFilter = headerFilter.toLowerCase();
        return entries.filter(([k, v]) =>
            k.toLowerCase().includes(lowerFilter) || String(v).toLowerCase().includes(lowerFilter)
        );
    }, [headers, headerFilter]);

    return (
        <div className="flex flex-col flex-1 overflow-auto">
            {/* Filter bar */}
            <div className="p-2 border-b bg-muted/10 sticky top-0 backdrop-blur-sm z-10 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground ml-2 shrink-0" />
                <Input
                    className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    placeholder="Filter headers..."
                    value={headerFilter}
                    onChange={(e) => setHeaderFilter(e.target.value)}
                />
                {headerFilter && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setHeaderFilter('')}>
                        <X className="w-3 h-3" />
                    </Button>
                )}
            </div>

            {/* Table */}
            <div className="w-full text-sm pb-4 flex-1 flex flex-col min-h-0">
                <div className="grid grid-cols-[1fr_2fr] border-b divide-x divide-border bg-muted/20 overflow-hidden">
                    <div className="p-2 pl-4 font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Key</div>
                    <div className="p-2 pl-4 font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Value</div>
                </div>
                <div className="flex-1 overflow-auto no-scrollbar">
                    {filteredHeaders.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-xs italic">
                            No headers found matching "{headerFilter}"
                        </div>
                    ) : (
                        filteredHeaders.map(([key, value], index) => (
                            <div key={`${key}-${index}`} className="grid grid-cols-[1fr_2fr] border-b last:border-0 divide-x divide-border hover:bg-muted/10 transition-colors group/row">
                                <div className="p-2 pl-4 font-mono text-xs text-foreground/80 truncate select-all group-hover/row:text-foreground">{key}</div>
                                <div className="p-2 pl-4 font-mono text-xs text-foreground/70 break-all select-all group-hover/row:text-foreground">{value}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
