import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useLocation } from 'react-router-dom';
import { Download, Smartphone, X } from 'lucide-react';
import { useDetails } from '../contexts/UIContext';
import { useToast } from '../contexts/ToastContext';
import { useLockBodyScroll } from '../hooks';
import './app-download-prompt.css';

const DISMISS_STORAGE_KEY = 'vybe_android_prompt_dismissed_until';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 850;
const APK_DOWNLOAD_PATH = '/Vybe.apk';

function isWithinDismissCooldown(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const until = Number.parseInt(raw, 10);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function saveDismissCooldown(): void {
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now() + DISMISS_TTL_MS));
  } catch {
    // Ignore storage quota or private-mode restriction errors.
  }
}

export function AppDownloadPrompt() {
  const isNative = Capacitor.isNativePlatform();
  const location = useLocation();
  const { detailsId } = useDetails();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => isNative || isWithinDismissCooldown());
  const cardRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeAfterDownloadTimerRef = useRef<number>();

  const isWatchRoute = location.pathname.startsWith('/watch');
  useLockBodyScroll(isOpen);

  useEffect(() => {
    return () => {
      if (closeAfterDownloadTimerRef.current) {
        window.clearTimeout(closeAfterDownloadTimerRef.current);
      }
    };
  }, []);

  const dismiss = useCallback(() => {
    saveDismissCooldown();
    setDismissed(true);
    setIsOpen(false);
  }, []);

  const handleDownload = useCallback(() => {
    saveDismissCooldown();
    showToast('Downloading Vybe Android app (Vybe.apk)…', { icon: 'check' });
    // Defer unmounting the anchor slightly so the browser processes the native download attribute first.
    closeAfterDownloadTimerRef.current = window.setTimeout(() => {
      setDismissed(true);
      setIsOpen(false);
    }, 150);
  }, [showToast]);

  // Never show inside Capacitor Android/iOS APK, on active playback, or over an open title modal.
  useEffect(() => {
    if (isNative || dismissed || isOpen || isWatchRoute || Boolean(detailsId)) return;

    const timer = window.setTimeout(() => {
      if (!isWithinDismissCooldown()) {
        setIsOpen(true);
      }
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isNative, dismissed, isOpen, isWatchRoute, detailsId]);

  // Close immediately if the visitor navigates into playback.
  useEffect(() => {
    if (isOpen && isWatchRoute) {
      setIsOpen(false);
    }
  }, [isOpen, isWatchRoute]);

  // Escape-key dismissal and focus management.
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
  }, [isOpen, dismiss]);

  if (isNative || !isOpen) {
    return null;
  }

  return (
    <div className="app-prompt-backdrop" onClick={dismiss}>
      <div
        ref={cardRef}
        className="app-prompt-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vybe-app-prompt-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="app-prompt__close"
          onClick={dismiss}
          aria-label="Close download prompt"
        >
          <X size={18} />
        </button>

        <div className="app-prompt__badge" aria-hidden="true">
          <img src="/vybe-logo.png" alt="" className="app-prompt__logo" />
          <span className="app-prompt__phone-pill">
            <Smartphone size={12} />
          </span>
        </div>

        <h2 id="vybe-app-prompt-title" className="app-prompt__title">
          Get the Vybe Android App
        </h2>

        <p className="app-prompt__desc">
          Stream faster on Android with fullscreen landscape playback and built-in popup protection.
        </p>

        <a
          href={APK_DOWNLOAD_PATH}
          download="Vybe.apk"
          className="app-prompt__download"
          onClick={handleDownload}
        >
          <Download size={18} aria-hidden="true" />
          <span>Download APK</span>
          <span className="app-prompt__size">1.8 MB</span>
        </a>

        <button type="button" className="app-prompt__dismiss" onClick={dismiss}>
          Not now, continue on website
        </button>
      </div>
    </div>
  );
}
