import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import { useEnvironmentStore } from "../stores/environmentStore";
import { useCollectionStore } from "../stores/useCollectionStore";
import { CreateEnvironmentDialog } from "./environment/CreateEnvironmentDialog";
import { ActivityBar, SidebarView } from "./sidebar/ActivityBar";
import { ExplorerView } from "./sidebar/ExplorerView";
import { EnvironmentView } from "./sidebar/EnvironmentView";
import { SidebarErrorBoundary } from "./SidebarErrorBoundary";


interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const [activeView, setActiveView] = useState<SidebarView>('explorer');
    const [isCreateEnvOpen, setIsCreateEnvOpen] = useState(false);

    const { roots } = useCollectionStore();
    const { loadEnvironments, createEnvironment } = useEnvironmentStore();

    useEffect(() => {
        if (roots.length > 0) {
            loadEnvironments();
        }
    }, [roots, loadEnvironments]);

    const handleCreateEnv = async (name: string, scope: 'global' | 'project') => {
        try {
            await createEnvironment(name, scope);
        } catch (e) {
            console.error("[SidebarV2] createEnvironment failed:", e);
        }
    };

    return (
        <div className={cn("flex flex-row h-full bg-background overflow-hidden select-none", className)}>
            {/* 1. Activity Bar (Fixed 48px) */}
            <div className="w-[48px] shrink-0 z-20 h-full border-r border-border/50 bg-sidebar">
                <ActivityBar activeView={activeView} onViewChange={setActiveView} />
            </div>

            {/* 2. Resizable Sidebar Panel */}
            <div className="flex-1 flex flex-col min-w-[220px] bg-card h-full border-r border-border/50">
                <SidebarErrorBoundary>
                    {activeView === 'explorer' && <ExplorerView />}

                    {activeView === 'environments' && (
                        <EnvironmentView
                            onCreateClick={() => setIsCreateEnvOpen(true)}
                        />
                    )}
                </SidebarErrorBoundary>
            </div>

            <CreateEnvironmentDialog
                open={isCreateEnvOpen}
                onOpenChange={setIsCreateEnvOpen}
                onCreate={handleCreateEnv}
                isProjectOpen={roots.length > 0}
            />
        </div>
    );
}
