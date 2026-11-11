/**
 * Vybe Shield — Lightweight Ad & Popup Blocker for embedded streaming.
 * Neutralizes popup ads, popunders, and malicious postMessage hooks without layout thrashing.
 */

const AD_DOMAINS = [
  'popads',
  'propellerads',
  'exoclick',
  'adcash',
  'adsterra',
  'bet365',
  '1xbet',
  'clickadu',
  'hilltopads',
  'trafficstars',
  'ero-advertising',
  'juicyads',
  'onclick',
  'syndication',
  'adservice',
  'doubleclick',
  'histats',
  'soycdn',
  'vsembed.ru/assets/sbx',
];

const ALLOWED_POPUP_HOSTS = [
  'youtube.com',
  'youtu.be',
  'themoviedb.org',
  'github.com',
];

interface AdBlockStats {
  blockedPopups: number;
  blockedScripts: number;
  blockedRedirects: number;
}

const stats: AdBlockStats = {
  blockedPopups: 0,
  blockedScripts: 0,
  blockedRedirects: 0,
};

let initialized = false;

function isAllowedPopupUrl(url?: string | URL): boolean {
  if (!url) return false;
  const raw = String(url).trim();
  if (!raw) return false;
  if (raw.startsWith('/') && !raw.startsWith('//')) return true;

  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    if (parsed.origin === window.location.origin) {
      return true;
    }
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_POPUP_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

function isAdSource(src: string): boolean {
  const lower = src.toLowerCase();
  return AD_DOMAINS.some((domain) => lower.includes(domain));
}

/**
 * Initializes lightweight global anti-popup and ad-blocking defenses.
 * Call once at app startup in main.tsx.
 */
export function initAdBlocker(): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  // ── 1. Intercept window.open with strict hostname validation ─────
  const originalWindowOpen = window.open;

  window.open = function (
    url?: string | URL,
    target?: string,
    features?: string,
  ): Window | null {
    if (!isAllowedPopupUrl(url)) {
      stats.blockedPopups++;
      return null;
    }

    return originalWindowOpen.call(window, url, target, features);
  };

  // ── 2. Intercept deceptive scam alert dialogs ────────────────────
  const originalAlert = window.alert;
  window.alert = function (message?: any) {
    const text = String(message || '').toLowerCase();
    if (
      text.includes('virus') ||
      text.includes('winner') ||
      text.includes('vpn') ||
      text.includes('cleaner')
    ) {
      stats.blockedRedirects++;
      return;
    }
    return originalAlert.call(window, message);
  };

  // ── 3. Zero-reflow MutationObserver for rogue injected script/iframe tags ─
  // Avoids calling getComputedStyle() on DOM nodes so React carousel/modal renders never stall.
  try {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;

          if (node.tagName === 'SCRIPT' || node.tagName === 'IFRAME') {
            const src = (node as HTMLScriptElement | HTMLIFrameElement).src || '';
            if (src && isAdSource(src)) {
              stats.blockedScripts++;
              node.remove();
            }
          }
        });
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  } catch {
    // MutationObserver fallback
  }

  // ── 4. Block malicious postMessage ad triggers ───────────────────
  window.addEventListener(
    'message',
    (event) => {
      try {
        if (typeof event.data !== 'string') return;
        const data = event.data.toLowerCase();
        if (
          data.includes('ad_click') ||
          data.includes('popunder') ||
          data.includes('open_tab') ||
          data.includes('show_ad')
        ) {
          event.stopImmediatePropagation();
        }
      } catch {}
    },
    { capture: true },
  );
}

/**
 * Returns the current count of blocked popups and ad elements.
 */
export function getAdBlockStats(): AdBlockStats {
  return { ...stats };
}

