import { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { cn } from "../lib/utils";

interface LayoutProps {
    children: React.ReactNode;
}

const MIN_SIDEBAR = 180;
const SNAP_THRESHOLD = 150;
const MAX_SIDEBAR_RATIO = 0.5;

export function Layout({ children }: LayoutProps) {
    // 1. Sidebar Visibility (Persisted)
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const saved = localStorage.getItem("radius_sidebar_open");
        return saved !== null ? saved === "true" : true;
    });

    // 2. Sidebar Width (Persisted, Fixed Pixels)
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem("radius_sidebar_width");
        const initial = saved ? parseInt(saved, 10) : 240;
        // Clamp to max on init (e.g. if window resized while closed or first load)
        const max = Math.max(200, window.innerWidth * 0.5);
        return Math.min(initial, max);
    });

    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Toggle Handler
    const toggleSidebar = () => {
        const willOpen = !isSidebarOpen;
        if (willOpen && sidebarWidth < MIN_SIDEBAR) {
            // Professional UX: Open at standard width (240px) if it was collapsed/too small
            const safeWidth = 240;
            setSidebarWidth(safeWidth);
            localStorage.setItem("radius_sidebar_width", String(safeWidth));
        }
        setIsSidebarOpen(willOpen);
        localStorage.setItem("radius_sidebar_open", String(willOpen));
    };

    // Resize Handlers
    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                const newWidth = mouseMoveEvent.clientX;
                const maxWidth = Math.min(600, window.innerWidth * MAX_SIDEBAR_RATIO);

                // Snap to close
                if (newWidth < SNAP_THRESHOLD) {
                    setIsSidebarOpen(false);
                    setIsResizing(false);
                    localStorage.setItem("radius_sidebar_open", "false");
                    // Reset to standard width (240px) for next open
                    // This feels more "natural" than the bare minimum (180px)
                    const resetWidth = 240;
                    setSidebarWidth(resetWidth);
                    localStorage.setItem("radius_sidebar_width", String(resetWidth));
                    return;
                }

                // Normal resize (clamped to min/max)
                if (newWidth >= MIN_SIDEBAR && newWidth <= maxWidth) {
                    setSidebarWidth(newWidth);
                    localStorage.setItem("radius_sidebar_width", String(newWidth));
                }
            }
        },
        [isResizing]
    );

    // Global Event Listeners for Dragging
    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground select-none">
            {/* 1. Sidebar Panel */}
            {isSidebarOpen && (
                <div
                    ref={sidebarRef}
                    className="flex shrink-0 bg-sidebar border-r border-border/50 relative"
                    style={{ width: `${sidebarWidth}px`, minWidth: `${MIN_SIDEBAR}px` }}
                >
                    <Sidebar className="w-full h-full" />

                    {/* Resizer Handle (Overlay on right edge) */}
                    <div
                        className={cn(
                            "absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize hover:bg-primary/50 transition-colors z-50",
                            isResizing && "bg-primary w-[4px]" // Visual feedback when dragging
                        )}
                        onMouseDown={startResizing}
                    />
                </div>
            )}

            {/* 2. Main Content (Flex-1 fills remaining space) */}
            <main className="flex-1 flex flex-col overflow-hidden relative h-full min-w-0">
                <TabBar onToggleSidebar={toggleSidebar} />

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {children}
                </div>
            </main>
        </div>
    );
}
