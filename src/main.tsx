import { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#182416] text-[#f2f6f0] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full rounded-2xl bg-[#202e1c] border border-[#2e422a] p-8 shadow-xl">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-600/20 text-green-400 mb-4 border border-green-500/20">
              🌱
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">DAPOSI Platform</h2>
            <p className="text-sm text-[#c2d3bd] mb-6">
              A temporary display issue occurred. Click below to refresh the page.
            </p>
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="w-full rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-500 transition-all shadow-md"
            >
              Refresh DAPOSI
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
