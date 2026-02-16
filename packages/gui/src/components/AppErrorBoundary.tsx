import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    /** Label shown in the error fallback (e.g. "Request Editor") */
    region?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Generic error boundary that can wrap any region of the app.
 * Shows a friendly error message with a retry button.
 */
export class AppErrorBoundary extends Component<Props, State> {
    public state: State = { hasError: false, error: null };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[${this.props.region ?? 'App'}] Uncaught error:`, error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 gap-4">
                    <div className="text-center space-y-2 max-w-md">
                        <h3 className="text-lg font-semibold text-destructive">
                            {this.props.region ?? 'Component'} crashed
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {this.state.error?.message}
                        </p>
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
