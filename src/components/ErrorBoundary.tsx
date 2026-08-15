import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleClearAndReset = () => {
    try {
      localStorage.removeItem('kk_editor_state');
      localStorage.removeItem('kk_analysis_state');
      localStorage.removeItem('kk_custom_prompt');
    } catch { }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <AlertTriangle size={28} className="text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Terjadi Kesalahan</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Komponen mengalami error. Coba muat ulang atau bersihkan data.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw size={14} />
              Coba Lagi
            </button>
            <button
              onClick={this.handleClearAndReset}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
            >
              Bersihkan Data
            </button>
          </div>
          {this.state.error && (
            <pre className="mt-2 text-[10px] text-muted-foreground max-w-md overflow-auto bg-muted rounded-lg p-3 border border-border">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
