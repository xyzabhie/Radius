import { CheckCircle2, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { TestResult } from './types';
import { useState } from 'react';
import { cn } from '../../lib/utils';

interface TestResultsPanelProps {
    results: TestResult[];
}

export function TestResultsPanel({ results }: TestResultsPanelProps) {
    if (!results || results.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-border/40 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 opacity-20" />
                </div>
                <p className="text-sm">No tests were run for this request</p>
            </div>
        );
    }

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    return (
        <div className="p-4 space-y-6 h-full overflow-auto">
            {/* Summary Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/20">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">Test Results</h3>
                    <div className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold",
                        passedCount === totalCount ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                    )}>
                        {passedCount}/{totalCount} Passed
                    </div>
                </div>
            </div>

            {/* Individual Results */}
            <div className="space-y-3">
                {results.map((result, idx) => (
                    <TestItem key={idx} result={result} />
                ))}
            </div>
        </div>
    );
}

function TestItem({ result }: { result: TestResult }) {
    const [isExpanded, setIsExpanded] = useState(!result.passed);

    return (
        <div className={cn(
            "rounded-lg border bg-background/50 overflow-hidden transition-all",
            result.passed ? "border-emerald-500/20" : "border-destructive/30"
        )}>
            <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    {result.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className={cn(
                        "text-sm font-medium",
                        result.passed ? "text-emerald-500" : "text-destructive"
                    )}>
                        {result.name}
                    </span>
                </div>
                <button className="text-muted-foreground/40">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            </div>

            {isExpanded && (
                <div className="px-4 pb-3 pt-1 border-t border-border/10 space-y-2 bg-muted/5">
                    {result.assertions.map((assertion, aidx) => (
                        <div key={aidx} className="flex items-start gap-2 text-xs py-1">
                            {assertion.passed ? (
                                <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            ) : (
                                <div className="w-1 h-1 rounded-full bg-destructive mt-1.5 shrink-0" />
                            )}
                            <div className="flex flex-col gap-1">
                                <span className={assertion.passed ? "text-muted-foreground" : "text-destructive"}>
                                    {assertion.message}
                                </span>
                                {assertion.error && (
                                    <code className="text-[10px] bg-destructive/10 text-destructive p-1 rounded border border-destructive/20 mt-1 break-all">
                                        {assertion.error}
                                    </code>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
