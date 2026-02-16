import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class SidebarErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 text-xs text-red-500 overflow-auto h-full">
                    <h3 className="font-bold mb-2">Sidebar Crash:</h3>
                    <pre className="whitespace-pre-wrap">{this.state.error?.message}</pre>
                    <pre className="mt-2 opacity-50">{this.state.error?.stack}</pre>
                </div>
            );
        }

        return this.props.children;
    }
}
