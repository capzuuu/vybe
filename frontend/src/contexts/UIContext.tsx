import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { Title } from '../types';

// ── Details modal ───────────────────────────────────────────────────

interface DetailsValue {
  detailsId: string | null;
  detailsTitle: Title | null;
  openDetails: (id: string, initialTitle?: Title) => void;
  closeDetails: () => void;
}

const DetailsContext = createContext<DetailsValue | null>(null);

// ── Hover preview (desktop expanded card) ───────────────────────────

export interface PreviewState {
  title: Title;
  rect: DOMRect;
}

interface PreviewValue {
  preview: PreviewState | null;
  schedulePreview: (title: Title, el: HTMLElement) => void;
  cancelPreview: () => void;
  closePreview: () => void;
}

const PreviewContext = createContext<PreviewValue | null>(null);

const OPEN_DELAY = 480;

export function UIProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [detailsTitle, setDetailsTitle] = useState<Title | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const timer = useRef<number>();

  const cancelPreview = useCallback(() => window.clearTimeout(timer.current), []);
  const closePreview = useCallback(() => {
    window.clearTimeout(timer.current);
    setPreview(null);
  }, []);

  const schedulePreview = useCallback((title: Title, el: HTMLElement) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (!el.isConnected || !el.matches(':hover')) return;
      setPreview({ title, rect: el.getBoundingClientRect() });
    }, OPEN_DELAY);
  }, []);

  const openDetails = useCallback(
    (id: string, initialTitle?: Title) => {
      closePreview();
      setDetailsId(id);
      setDetailsTitle(initialTitle || null);
    },
    [closePreview],
  );

  const closeDetails = useCallback(() => {
    setDetailsId(null);
    setDetailsTitle(null);
  }, []);

  // Reset transient UI on navigation.
  useEffect(() => {
    setDetailsId(null);
    setDetailsTitle(null);
    closePreview();
  }, [location.pathname, closePreview]);

  // Any page scroll invalidates the anchored preview position.
  useEffect(() => {
    if (!preview) return;
    const onScroll = () => closePreview();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [preview, closePreview]);

  const detailsValue = useMemo(
    () => ({ detailsId, detailsTitle, openDetails, closeDetails }),
    [detailsId, detailsTitle, openDetails, closeDetails]
  );

  const previewValue = useMemo(
    () => ({ preview, schedulePreview, cancelPreview, closePreview }),
    [preview, schedulePreview, cancelPreview, closePreview],
  );

  return (
    <DetailsContext.Provider value={detailsValue}>
      <PreviewContext.Provider value={previewValue}>{children}</PreviewContext.Provider>
    </DetailsContext.Provider>
  );
}

export function useDetails(): DetailsValue {
  const ctx = useContext(DetailsContext);
  if (!ctx) throw new Error('useDetails must be used within UIProvider');
  return ctx;
}

export function usePreview(): PreviewValue {
  const ctx = useContext(PreviewContext);
  if (!ctx) throw new Error('usePreview must be used within UIProvider');
  return ctx;
}
