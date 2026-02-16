import { useEffect } from "react";
import { Layout } from "./components/Layout";
import { useTabStore } from "./stores/useTabStore";
import { RequestEditor } from "./components/request/RequestEditor";
import { EnvironmentEditor } from "./components/environment/EnvironmentEditor";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { Plus, Zap, Globe, ArrowRight, FolderPlus } from "lucide-react";
import { Toaster } from "sonner";
import { useCollectionStore } from "./stores/useCollectionStore";
import { useThemeStore } from "./stores/useThemeStore";

function App() {
  const activeTabId = useTabStore((state) => state.activeTabId);
  const addTab = useTabStore((state) => state.addTab);
  const theme = useThemeStore((state) => state.theme);

  const handleNewRequest = () => {
    addTab({ name: "New Request", type: "request" });
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handleNewRequest();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <Layout>
      <Toaster theme={theme === 'dark' ? 'dark' : 'light'} position="bottom-right" richColors closeButton />
      {!activeTabId ? (
        <WelcomeScreen onNewRequest={handleNewRequest} />
      ) : (
        <AppErrorBoundary region="Editor">
          <ContentArea activeTabId={activeTabId} />
        </AppErrorBoundary>
      )}
    </Layout>
  );
}

/* ═══════════════════════════════════════════
 *  WELCOME SCREEN — shown when no tabs open
 * ═══════════════════════════════════════════ */
function WelcomeScreen({ onNewRequest }: { onNewRequest: () => void }) {
  const shortcuts = [
    { keys: ["Ctrl", "N"], label: "New Request" },
    { keys: ["Ctrl", "Enter"], label: "Send Request" },
    { keys: ["Ctrl", "S"], label: "Save" },
    { keys: ["Ctrl", "E"], label: "Quick Send" },
  ];

  const hasCollections = useCollectionStore((state) => state.roots.length > 0);

  return (
    <div className="flex flex-col items-center justify-center h-full relative overflow-hidden select-none">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shadow-lg shadow-primary/5">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Radius
            </h1>
            <p className="text-base text-muted-foreground/60">
              Lightning-fast API client
            </p>
          </div>
        </div>

        {/* Quick Action */}
        <button
          onClick={onNewRequest}
          className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 hover:border-primary/30 transition-all duration-300 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <Plus className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <span className="text-base font-medium text-foreground">New Request</span>
            <p className="text-sm text-muted-foreground/50">Start building your API call</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/30 ml-4 group-hover:text-primary/50 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Keyboard Shortcuts */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground/40 font-medium">
            Keyboard Shortcuts
          </span>
          <div className="grid grid-cols-2 gap-x-10 gap-y-3">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.label} className="flex items-center gap-2">
                <div className="flex gap-1">
                  {shortcut.keys.map((key) => (
                    <kbd
                      key={key}
                      className="px-2 py-1 text-xs font-mono bg-muted/30 border border-border/20 rounded text-muted-foreground/50 min-w-[26px] text-center"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground/50">{shortcut.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer hint — context-aware */}
        <div className="flex items-center gap-2 text-muted-foreground/30 text-sm pt-4">
          {hasCollections ? (
            <>
              <Globe className="w-3.5 h-3.5" />
              <span>Select a request from the sidebar to get started</span>
            </>
          ) : (
            <>
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Add a collection from the sidebar to begin</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ContentArea({ activeTabId }: { activeTabId: string }) {
  const tabs = useTabStore(state => state.tabs);
  const activeTab = tabs.find(t => t.id === activeTabId);

  if (activeTab?.type === 'environment') {
    return <EnvironmentEditor key={activeTabId} tabId={activeTabId} />;
  }

  return <RequestEditor key={activeTabId} tabId={activeTabId} />;
}


export default App;

