import { useMemo } from "react";
import { cn } from "../../lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { RadiusResponse } from "@radius/core";
import { Zap } from "lucide-react";
import { ResponseBody } from "./ResponseBody";
import { ResponseHeaders } from "./ResponseHeaders";
import { ViewMode } from "./ResponseToolbar";
import { TestResult } from "../request/types";
import { TestResultsPanel } from "../request/TestResultsPanel";

interface ResponseViewerProps {
    response: RadiusResponse | null;
    testResults?: TestResult[];
    loading: boolean;
    error: string | null;
    viewMode: ViewMode;
    lineWrap: boolean;
}

/** Shared tab trigger styling */
const tabTriggerClass = [
    "data-[state=active]:border-b-2 data-[state=active]:border-primary",
    "rounded-none border-b-2 border-transparent",
    "px-0 pb-2 pt-2 font-medium text-xs",
    "text-muted-foreground data-[state=active]:text-foreground",
    "bg-transparent data-[state=active]:bg-transparent shadow-none hover:text-foreground transition-colors",
].join(" ");

export function ResponseViewer({ response, testResults, loading, error, viewMode, lineWrap }: ResponseViewerProps) {
    const { headerCount, testSummary } = useMemo(() => {
        if (!response) return { headerCount: 0, testSummary: { passed: 0, total: 0 } };

        return {
            headerCount: Object.keys(response.headers).length,
            testSummary: {
                passed: testResults?.filter(r => r.passed).length || 0,
                total: testResults?.length || 0
            }
        };
    }, [response, testResults]);

    return (
        <div className="flex flex-col h-full bg-panel">
            {loading ? (
                <div className="flex h-full items-center justify-center text-muted-foreground gap-2">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="ml-2 font-medium text-xs tracking-wide uppercase">Sending Request...</span>
                </div>
            ) : error ? (
                <div className="flex h-full flex-col items-center justify-center p-8 bg-muted/5">
                    <div className="max-w-md w-full bg-destructive/5 border border-destructive/20 rounded-lg p-6 text-center">
                        <h3 className="font-semibold text-destructive mb-2">Execution Failed</h3>
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                </div>
            ) : !response ? (
                <div className="flex flex-col h-full items-center justify-center text-muted-foreground/40 select-none">
                    <div className="mb-4 p-4 rounded-full bg-muted/20">
                        <Zap className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="font-medium text-sm">No response available</p>
                    <div className="flex items-center gap-1.5 mt-3 opacity-60">
                        <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono shadow-sm">Ctrl</kbd>
                        <span className="text-[10px]">+</span>
                        <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono shadow-sm">Enter</kbd>
                        <span className="text-[10px]">to send request</span>
                    </div>
                </div>
            ) : (
                <Tabs defaultValue="body" className="flex flex-col h-full">
                    <div className="border-b border-border/10 px-4 bg-card">
                        <TabsList className="h-9 w-full justify-start gap-6 bg-transparent p-0">
                            <TabsTrigger value="body" className={tabTriggerClass}>
                                Body
                            </TabsTrigger>
                            <TabsTrigger value="headers" className={cn(tabTriggerClass, "group")}>
                                Headers
                                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
                                    {headerCount}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="tests" className={cn(tabTriggerClass, "group flex items-center gap-2")}>
                                <div className="flex items-center gap-1.5">
                                    Tests
                                </div>
                                {testSummary.total > 0 && (
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-colors",
                                        testSummary.passed === testSummary.total
                                            ? "bg-emerald-500/10 text-emerald-500"
                                            : "bg-orange-500/10 text-orange-500"
                                    )}>
                                        {testSummary.passed}/{testSummary.total}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="body" className="flex-1 p-0 m-0 mt-0 border-none relative overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
                        <ResponseBody response={response} viewMode={viewMode} lineWrap={lineWrap} />
                    </TabsContent>

                    <TabsContent value="headers" className="flex-1 p-0 mt-0 border-none overflow-hidden data-[state=active]:flex flex-col">
                        <ResponseHeaders headers={response.headers} />
                    </TabsContent>

                    <TabsContent value="tests" className="flex-1 p-0 mt-0 border-none overflow-hidden data-[state=active]:flex flex-col">
                        <TestResultsPanel results={testResults || []} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
