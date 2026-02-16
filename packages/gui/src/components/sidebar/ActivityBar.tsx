import { Layers, Server, Settings, Moon, Sun } from "lucide-react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../stores/useThemeStore";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export type SidebarView = 'explorer' | 'environments';

interface ActivityBarProps {
    activeView: SidebarView;
    onViewChange: (view: SidebarView) => void;
}

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
    const { theme, setTheme } = useThemeStore();

    return (
        <div className="w-[48px] border-r border-border/40 bg-sidebar flex flex-col items-center pt-2 shrink-0 z-20 h-full">
            {/* Top Icons */}
            <div className="flex flex-col gap-2 w-full items-center">
                {/* Explorer Tab */}
                <div
                    className={cn(
                        "relative p-2.5 transition-colors cursor-pointer group w-full flex justify-center",
                        activeView === 'explorer' ? "text-foreground" : "text-muted-foreground/60 hover:text-foreground"
                    )}
                    onClick={() => onViewChange('explorer')}
                    title="Explorer (Files)"
                >
                    {activeView === 'explorer' && (
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary" />
                    )}
                    <Layers className="h-6 w-6 stroke-[1.2]" />
                </div>

                {/* Environments Tab */}
                <div
                    className={cn(
                        "relative p-2.5 transition-colors cursor-pointer group w-full flex justify-center",
                        activeView === 'environments' ? "text-foreground" : "text-muted-foreground/60 hover:text-foreground"
                    )}
                    onClick={() => onViewChange('environments')}
                    title="Environments"
                >
                    {activeView === 'environments' && (
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary" />
                    )}
                    <Server className="h-6 w-6 stroke-[1.2]" />
                </div>
            </div>

            {/* Bottom Icons (Settings) */}
            <div className="mt-auto flex flex-col gap-4 w-full items-center mb-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div
                            className="relative p-2.5 text-muted-foreground/60 hover:text-foreground cursor-pointer transition-colors w-full flex justify-center"
                            title="Settings"
                        >
                            <Settings className="h-6 w-6 stroke-[1.2]" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="end" className="w-[180px] ml-2">
                        <DropdownMenuLabel>Settings</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2 py-1.5">Theme</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2">
                            <Sun className="h-4 w-4" />
                            <span>Light Mode</span>
                            {theme === 'light' && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2">
                            <Moon className="h-4 w-4" />
                            <span>Dark Mode</span>
                            {theme === 'dark' && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
