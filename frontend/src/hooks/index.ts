import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import type { Title } from '../types';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Phone layout: poster cards, bottom tab bar, stacked hero. */
export const useIsMobile = () => useMediaQuery('(max-width: 639px)');
/** Fine pointer devices get hover previews. */
export const useCanHover = () => useMediaQuery('(hover: hover) and (pointer: fine)');
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(() => window.scrollY > threshold);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

export function useDebounce<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Locks page scroll (compensating for the scrollbar to avoid layout shift). */
export function useLockBodyScroll(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    documentElement.style.setProperty('--scrollbar-comp', `${scrollbar}px`);
    return () => {
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
      documentElement.style.setProperty('--scrollbar-comp', '0px');
    };
  }, [active]);
}

export function useOnClickOutside(ref: RefObject<HTMLElement>, handler: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const listener = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener('pointerdown', listener);
    return () => document.removeEventListener('pointerdown', listener);
  }, [ref, handler, active]);
}

export function useInView<T extends Element>(ref: RefObject<T>, threshold = 0.25): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return inView;
}

export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

/**
 * Dropdown behaviour shared by the profile, notification and genre menus:
 * opens on hover (desktop) or click/tap, closes on outside click or Escape.
 */
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>();
  const canHover = useCanHover();

  const close = useCallback(() => setOpen(false), []);
  useOnClickOutside(ref, close, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const hoverProps = canHover
    ? {
      onMouseEnter: () => {
        window.clearTimeout(closeTimer.current);
        setOpen(true);
      },
      onMouseLeave: () => {
        closeTimer.current = window.setTimeout(() => setOpen(false), 220);
      },
    }
    : {};

  return { open, setOpen, close, ref, hoverProps, toggle: () => setOpen((o) => !o) };
}

/** Shared "Play" behaviour: resumes the saved episode / position if there is one. */
export function usePlayTitle() {
  const navigate = useNavigate();
  const { getProgress, saveProgress } = useLibrary();
  return useCallback(
    (title: Title, episodeId?: string) => {
      const saved = getProgress(title.id);
      const ep = episodeId ?? saved?.episodeId ?? title.seasons?.[0]?.episodes[0]?.id;
      if (!saved) {
        saveProgress({
          titleId: title.id,
          episodeId: ep,
          position: 10,
          duration: (title.runtime || 120) * 60,
        });
      }
      navigate(`/watch/${title.id}${ep && title.type === 'series' ? `?ep=${ep}` : ''}`);
    },
    [navigate, getProgress, saveProgress],
  );
}

/** My List toggle with toast feedback, shared by every surface. */
export function useListToggle() {
  const { toggleList } = useLibrary();
  const { showToast } = useToast();
  return useCallback(
    (title: Title) => {
      const added = toggleList(title.id);
      showToast(added ? `Added “${title.name}” to My List` : `Removed “${title.name}” from My List`, {
        icon: added ? 'check' : 'info',
        action: { label: 'Undo', onClick: () => toggleList(title.id, !added) },
      });
    },
    [toggleList, showToast],
  );
}

/** Thumbs-up rating toggle with toast feedback. */
export function useLikeToggle() {
  const { toggleLike } = useLibrary();
  const { showToast } = useToast();
  return useCallback(
    (title: Title) => {
      const liked = toggleLike(title.id);
      showToast(liked ? 'Thanks! We’ll recommend more like this.' : 'Rating removed', { icon: liked ? 'check' : 'info' });
    },
    [toggleLike, showToast],
  );
}
