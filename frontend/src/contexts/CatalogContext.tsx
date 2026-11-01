import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { fetchCatalog } from '../services/catalogService';
import { fetchTitleById } from '../services/tmdbService';
import type { Title } from '../types';
import { useProfiles, useLibrary } from './ProfileContext';

const KIDS_RATINGS = new Set(['ALL', '7+']);

interface CatalogValue {
  /** Titles visible to the active profile (kids profiles are filtered). */
  titles: Title[];
  loading: boolean;
  error: string | null;
  getTitle: (id: string) => Title | undefined;
  registerTitles: (newTitles: Title[]) => void;
}

const CatalogContext = createContext<CatalogValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { activeProfile } = useProfiles();
  const { myList, progress } = useLibrary();
  const [all, setAll] = useState<Title[]>([]);
  const [extraTitles, setExtraTitles] = useState<Map<string, Title>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCatalog()
      .then((data) => !cancelled && setAll(data))
      .catch(() => !cancelled && setError('Unable to load the catalog.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const registerTitles = useCallback((newTitles: Title[]) => {
    if (!newTitles.length) return;
    setExtraTitles((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const t of newTitles) {
        if (!next.has(t.id)) {
          next.set(t.id, t);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const attemptedIds = useRef(new Set<string>());

  // Automatically fetch and register any titles from My List or Continue Watching that aren't yet in catalog
  useEffect(() => {
    const missing: string[] = [];
    const known = new Set([...all.map((t) => t.id), ...Array.from(extraTitles.keys())]);

    for (const id of myList) {
      if (!known.has(id) && !missing.includes(id) && !attemptedIds.current.has(id)) {
        missing.push(id);
        attemptedIds.current.add(id);
      }
    }
    for (const p of progress) {
      if (!known.has(p.titleId) && !missing.includes(p.titleId) && !attemptedIds.current.has(p.titleId)) {
        missing.push(p.titleId);
        attemptedIds.current.add(p.titleId);
      }
    }

    if (missing.length === 0) return;

    let active = true;
    Promise.all(missing.map((id) => fetchTitleById(id).catch(() => null))).then((results) => {
      if (!active) return;
      const found = results.filter(Boolean) as Title[];
      if (found.length > 0) {
        registerTitles(found);
      }
    });

    return () => {
      active = false;
    };
  }, [myList, progress, all, extraTitles, registerTitles]);

  const kids = !!activeProfile?.kids;

  const value = useMemo<CatalogValue>(() => {
    // Strictly de-duplicate all titles by id to prevent duplicate React keys
    const seen = new Set<string>();
    const combined: Title[] = [];

    for (const t of all) {
      if (t?.id && !seen.has(t.id)) {
        seen.add(t.id);
        combined.push(t);
      }
    }
    for (const t of extraTitles.values()) {
      if (t?.id && !seen.has(t.id)) {
        seen.add(t.id);
        combined.push(t);
      }
    }

    const titles = kids ? combined.filter((t) => KIDS_RATINGS.has(t.maturity)) : combined;
    const map = new Map(combined.map((t) => [t.id, t]));
    return {
      titles,
      loading,
      error,
      getTitle: (id) => map.get(id),
      registerTitles,
    };
  }, [all, extraTitles, kids, loading, error, registerTitles]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}
