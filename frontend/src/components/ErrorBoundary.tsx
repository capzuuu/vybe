import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Detect stale chunk load error from new deployment (Vite code splitting)
    const isChunkError =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('error loading dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('failed to fetch') ||
      error?.name === 'ChunkLoadError';

    if (isChunkError && typeof window !== 'undefined') {
      const lastReload = window.sessionStorage.getItem('vybe_chunk_reload');
      const now = Date.now();
      // Auto-reload once to fetch new deployment assets without showing an error screen
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        window.sessionStorage.setItem('vybe_chunk_reload', now.toString());
        window.location.reload();
        return { hasError: false, error: null };
      }
    }

    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Vybe ErrorBoundary] Uncaught render exception:', error, errorInfo);

    const isChunkError =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('error loading dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('failed to fetch') ||
      error?.name === 'ChunkLoadError';

    if (isChunkError && typeof window !== 'undefined') {
      const lastReload = window.sessionStorage.getItem('vybe_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        window.sessionStorage.setItem('vybe_chunk_reload', now.toString());
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    try {
      window.sessionStorage.removeItem('vybe_chunk_reload');
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    try {
      window.sessionStorage.removeItem('vybe_chunk_reload');
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#141414',
            color: '#fff',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              backgroundColor: 'rgba(24, 24, 27, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2.5rem 2rem',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(229, 9, 20, 0.15)',
                border: '1px solid rgba(229, 9, 20, 0.4)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 1.25rem auto',
                color: '#e50914',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '2rem' }}>
              An unexpected error occurred. Don't worry, your watch progress and profile are safe.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#e50914',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.65rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={16} />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '0.65rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                <Home size={16} />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

