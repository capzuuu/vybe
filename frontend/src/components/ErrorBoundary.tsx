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

  private handleClearStorageAndReload = () => {
    try {
      window.sessionStorage.clear();
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('vybe:') || k.startsWith('tmdb:'))) {
          localStorage.removeItem(k);
        }
      }
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
              maxWidth: '520px',
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
            <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              An unexpected error occurred. Don't worry, your watch progress and profile are safe.
            </p>

            {this.state.error && (
              <details
                style={{
                  textAlign: 'left',
                  margin: '0 0 1.75rem 0',
                  background: 'rgba(0, 0, 0, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.8rem',
                  color: '#f87171',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', outline: 'none' }}>
                  Technical Details (Click to show error)
                </summary>
                <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', marginTop: '0.65rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                  <strong>{this.state.error.name}:</strong> {this.state.error.message}
                  {this.state.error.stack && (
                    <div style={{ marginTop: '0.5rem', opacity: 0.7, fontSize: '0.72rem', color: '#cbd5e1' }}>
                      {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
                    </div>
                  )}
                </div>
              </details>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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

              <button
                type="button"
                onClick={this.handleClearStorageAndReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'transparent',
                  color: 'rgba(255, 255, 255, 0.6)',
                  border: '1px dashed rgba(255, 255, 255, 0.25)',
                  borderRadius: '6px',
                  padding: '0.65rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
                title="Clears corrupted local cache and restarts fresh"
              >
                <span>Reset Local Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

