/**
 * Vybe Shield — Intelligent Ad & Popup Blocker for embedded streaming.
 * Neutralizes popup ads, popunders, clickjacking overlays, and redirect hijacking.
 */

// Known ad and tracking network patterns
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

/**
 * Initializes global anti-popup and ad-blocking defenses.
 * Call once at app startup in main.tsx.
 */
export function initAdBlocker(): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  // ── 1. Intercept window.open (Neutralize Popup Ads) ───────────────
  const originalWindowOpen = window.open;

  window.open = function (
    url?: string | URL,
    target?: string,
    features?: string,
  ): Window | null {
    const targetUrl = String(url || '').toLowerCase();

    // Whitelist legitimate app destinations: YouTube trailers, TMDB, internal routes
    const isWhitelisted =
      targetUrl === '' ||
      targetUrl.startsWith('/') ||
      targetUrl.startsWith(window.location.origin) ||
      targetUrl.includes('youtube.com') ||
      targetUrl.includes('youtu.be') ||
      targetUrl.includes('themoviedb.org');

    if (!isWhitelisted) {
      stats.blockedPopups++;
      console.warn(`[Vybe Shield 🛡️] Blocked popup ad #${stats.blockedPopups}:`, url);
      return null;
    }

    return originalWindowOpen.call(window, url, target, features);
  };

  // ── 2. Intercept window.alert/confirm dialogs from ad scripts ─────
  const originalAlert = window.alert;
  window.alert = function (message?: any) {
    const text = String(message || '').toLowerCase();
    if (
      text.includes('virus') ||
      text.includes('winner') ||
      text.includes('vpn') ||
      text.includes('update') ||
      text.includes('cleaner')
    ) {
      console.warn('[Vybe Shield 🛡️] Blocked scam alert modal:', message);
      return;
    }
    return originalAlert.call(window, message);
  };

  // ── 3. Prevent Focus Stealing / Popunders ──────────────────────────
  window.addEventListener(
    'blur',
    () => {
      // If window blurs while active on the watch screen, immediately refocus
      if (window.location.pathname.startsWith('/watch')) {
        setTimeout(() => {
          window.focus();
        }, 50);
      }
    },
    { capture: true },
  );

  // ── 4. DOM MutationObserver: Defuse dynamically injected ad tags ──
  try {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check script tags
            if (node.tagName === 'SCRIPT') {
              const src = (node as HTMLScriptElement).src?.toLowerCase() || '';
              if (AD_DOMAINS.some((domain) => src.includes(domain))) {
                stats.blockedScripts++;
                node.remove();
                console.warn(`[Vybe Shield 🛡️] Blocked ad script #${stats.blockedScripts}:`, src);
              }
            }

            // Check rogue hidden clickjack overlays
            if (
              node.tagName === 'DIV' ||
              node.tagName === 'A' ||
              node.tagName === 'IFRAME'
            ) {
              const style = window.getComputedStyle(node);
              const isFixedFull =
                style.position === 'fixed' &&
                (style.zIndex === '2147483647' || parseInt(style.zIndex, 10) > 10000) &&
                (style.width === '100%' || style.width === `${window.innerWidth}px`);

              const isSuspiciousAd =
                node.id?.toLowerCase().includes('ad') ||
                node.className?.toString().toLowerCase().includes('popunder') ||
                node.className?.toString().toLowerCase().includes('banner-overlay');

              if (isFixedFull && isSuspiciousAd) {
                stats.blockedScripts++;
                node.remove();
                console.warn('[Vybe Shield 🛡️] Removed rogue clickjack overlay');
              }
            }
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  } catch {
    // MutationObserver fallback
  }

  // ── 5. Block Malicious postMessage Handshakes ──────────────────────
  window.addEventListener(
    'message',
    (event) => {
      try {
        const data = typeof event.data === 'string' ? event.data.toLowerCase() : '';
        if (
          data.includes('ad_click') ||
          data.includes('popunder') ||
          data.includes('open_tab') ||
          data.includes('show_ad')
        ) {
          event.stopImmediatePropagation();
          console.warn('[Vybe Shield 🛡️] Blocked malicious postMessage event');
        }
      } catch {}
    },
    { capture: true },
  );

  console.info('[Vybe Shield 🛡️] Ad & Popup Blocker initialized and active.');
}

/**
 * Returns the current count of blocked popups and ad elements.
 */
export function getAdBlockStats(): AdBlockStats {
  return { ...stats };
}

