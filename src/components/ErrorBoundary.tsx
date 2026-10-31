import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-zinc-950 border border-red-900/30 rounded-lg">
          <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-serif italic text-zinc-100 mb-2">System Error Encountered</h2>
          <p className="text-sm text-zinc-400 max-w-md mb-8 font-mono">
            The application encountered an unexpected error. This might be due to a temporary glitch or corrupted state.
          </p>
          
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded text-left w-full max-w-2xl mb-8 overflow-auto max-h-48">
            <p className="text-xs text-red-400 font-mono whitespace-pre-wrap">
              {this.state.error?.message || 'Unknown error'}
            </p>
          </div>

          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 font-mono text-xs uppercase tracking-widest transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
