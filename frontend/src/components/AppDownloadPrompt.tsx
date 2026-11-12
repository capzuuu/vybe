import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import vybeLogo from '../assets/vybe-logo.png';
import { useDetails } from '../contexts/UIContext';
import { useToast } from '../contexts/ToastContext';
import { useLockBodyScroll } from '../hooks';
import { trackApkDownload } from '../services/realtimeMonitorService';
import './app-download-prompt.css';

const DISMISS_STORAGE_KEY = 'vybe_android_app_prompt_dismissed';
const SHOW_DELAY_MS = 850;
const CLOSE_ANIMATION_MS = 180;
const APK_DOWNLOAD_URL = '/Vybe.apk';

type PromptPhase = 'closed' | 'open' | 'closing';

type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as NavigatorWithUAData;
  const platformHint = nav.userAgentData?.platform?.toLowerCase();
  if (platformHint === 'ios') return true;

  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return true;

  // Modern iPadOS reports MacIntel with multi-touch when desktop mode is active.
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
}

function isAndroidWebDevice(): boolean {
  if (typeof navigator === 'undefined' || isIOSDevice()) return false;
  const nav = navigator as NavigatorWithUAData;
  const platformHint = nav.userAgentData?.platform?.toLowerCase();
  if (platformHint === 'android') return true;

  return /android/i.test(navigator.userAgent || '');
}

function isPromptDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistPromptDismissal(): void {
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, '1');
  } catch {
    // Ignore storage restriction errors in private browsing modes.
  }
}

export function AppDownloadPrompt() {
  const isNative = Capacitor.isNativePlatform();
  const location = useLocation();
  const { detailsId } = useDetails();
  const { showToast } = useToast();

  const [phase, setPhase] = useState<PromptPhase>('closed');
  const [dismissed, setDismissed] = useState(() => isNative || isPromptDismissed());
  const cardRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<number>();
  const downloadStartTimerRef = useRef<number>();
  const hasShownInSessionRef = useRef(false);
  const downloadTriggeredRef = useRef(false);

  const isWatchRoute = location.pathname.startsWith('/watch');
  useLockBodyScroll(phase === 'open');

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (downloadStartTimerRef.current) window.clearTimeout(downloadStartTimerRef.current);
    };
  }, []);

  const beginClose = useCallback(() => {
    setPhase((current) => {
      if (current !== 'open') return current;
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = reducedMotion ? 0 : CLOSE_ANIMATION_MS;

      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (duration === 0) {
        return 'closed';
      }

      closeTimerRef.current = window.setTimeout(() => {
        setPhase('closed');
      }, duration);
      return 'closing';
    });
  }, []);

  const dismiss = useCallback(() => {
    persistPromptDismissal();
    setDismissed(true);
    beginClose();
  }, [beginClose]);

  const handleDownload = useCallback(() => {
    if (downloadTriggeredRef.current) return;
    downloadTriggeredRef.current = true;
    persistPromptDismissal();
    setDismissed(true);
    trackApkDownload('popup');
    showToast('Downloading Vybe Android app (Vybe.apk)…', { icon: 'check' });
    // Let the native anchor download initiate before transitioning out.
    if (downloadStartTimerRef.current) window.clearTimeout(downloadStartTimerRef.current);
    downloadStartTimerRef.current = window.setTimeout(() => {
      beginClose();
    }, 60);
  }, [beginClose, showToast]);

  // Only show on Android web browsers, never in Capacitor APK, iOS, watch routes, or over modals.
  useEffect(() => {
    if (
      isNative ||
      dismissed ||
      hasShownInSessionRef.current ||
      phase !== 'closed' ||
      isWatchRoute ||
      Boolean(detailsId) ||
      !isAndroidWebDevice()
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!isPromptDismissed() && isAndroidWebDevice()) {
        hasShownInSessionRef.current = true;
        setPhase('open');
      }
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isNative, dismissed, phase, isWatchRoute, detailsId]);

  // Close immediately if the visitor enters video playback.
  useEffect(() => {
    if (phase !== 'closed' && isWatchRoute) {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      setPhase('closed');
    }
  }, [phase, isWatchRoute]);

  // Escape key dismissal and focus restoration.
  useEffect(() => {
    if (phase !== 'open') return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cardRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [phase, dismiss]);

  if (isNative || phase === 'closed') {
    return null;
  }

  return (
    <div
      className="app-prompt-backdrop"
      data-state={phase}
      onClick={dismiss}
    >
      <div
        ref={cardRef}
        className="app-prompt-card"
        data-state={phase}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vybe-app-prompt-title"
        aria-describedby="vybe-app-prompt-desc"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="app-prompt__close"
          onClick={dismiss}
          aria-label="Close download prompt"
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        <img
          src={vybeLogo}
          alt="Vybe"
          className="app-prompt__logo"
          width={1024}
          height={341}
        />

        <h2 id="vybe-app-prompt-title" className="app-prompt__title">
          Enjoy Vybe on Android
        </h2>

        <p id="vybe-app-prompt-desc" className="app-prompt__desc">
          A better way to stream. Download the Android app for fullscreen playback and built-in popup protection.
        </p>

        <a
          href={APK_DOWNLOAD_URL}
          download="Vybe.apk"
          className="app-prompt__download"
          onClick={handleDownload}
        >
          Download Android App
        </a>

        <span className="app-prompt__meta">APK &middot; 1.8 MB</span>

        <button type="button" className="app-prompt__dismiss" onClick={dismiss}>
          Continue on website
        </button>
      </div>
    </div>
  );
}
