import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NATIVE_AUTH_SCHEME, supabase } from '../lib/supabase';

let initialized = false;
const handledOAuthUrls = new Set<string>();

/**
 * Processes deep-link OAuth callbacks (app.vybe.stream://login-callback?code=... or #access_token=...)
 * and restores the Supabase session inside the Capacitor WebView.
 */
async function handleOAuthDeepLink(rawUrl: string): Promise<void> {
  if (!rawUrl || !rawUrl.startsWith(`${NATIVE_AUTH_SCHEME}://`)) {
    return;
  }
  if (handledOAuthUrls.has(rawUrl)) {
    return;
  }
  handledOAuthUrls.add(rawUrl);

  // Dismiss Chrome Custom Tabs overlay cleanly
  Browser.close().catch(() => {});

  try {
    const parsed = new URL(rawUrl);
    const hashQuery = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
    const hashParams = new URLSearchParams(hashQuery);
    const searchParams = parsed.searchParams;

    const oauthError =
      searchParams.get('error_description') ||
      hashParams.get('error_description') ||
      searchParams.get('error') ||
      hashParams.get('error');

    if (oauthError) {
      window.dispatchEvent(
        new CustomEvent('vybe:oauth-error', {
          detail: decodeURIComponent(oauthError.replace(/\+/g, ' ')),
        }),
      );
      return;
    }

    // PKCE flow (?code=...)
    const code = searchParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        window.dispatchEvent(new CustomEvent('vybe:oauth-error', { detail: error.message }));
      }
      return;
    }

    // Implicit flow fallback (#access_token=...&refresh_token=...)
    const access_token = hashParams.get('access_token') || searchParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token');
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        window.dispatchEvent(new CustomEvent('vybe:oauth-error', { detail: error.message }));
      }
    }
  } catch (err) {
    console.warn('Failed to process native OAuth deep link:', err);
  }
}

/**
 * Configures native Android/iOS Capacitor behavior:
 * - Dark status bar matching VYBE's #141414 background
 * - Deep-link listener for Google OAuth callbacks returning from Chrome Custom Tabs
 * - Hardware back-button handling (closes fullscreen/modals/radial menu, goes back, or exits at root)
 */
export function initCapacitor(): void {
  if (typeof window === 'undefined' || initialized || !Capacitor.isNativePlatform()) {
    return;
  }
  initialized = true;

  // Style the system status bar
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#141414' }).catch(() => {});
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

  // Handle Google OAuth return deep links (warm resume + cold start)
  CapApp.addListener('appUrlOpen', ({ url }) => {
    void handleOAuthDeepLink(url);
  }).catch(() => {});

  CapApp.getLaunchUrl()
    .then((launch) => {
      if (launch?.url) {
        void handleOAuthDeepLink(launch.url);
      }
    })
    .catch(() => {});

  // Notify Login UI if user closes Chrome Custom Tab without signing in
  Browser.addListener('browserFinished', () => {
    window.dispatchEvent(new CustomEvent('vybe:oauth-browser-closed'));
  }).catch(() => {});

  // Handle Android hardware Back button / gesture
  CapApp.addListener('backButton', ({ canGoBack }) => {
    // 1. Exit DOM fullscreen playback if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }

    // 2. Dismiss open modals, dialogs, or radial menu
    const hasOpenOverlay = Boolean(
      document.querySelector('[role="dialog"], .modal-backdrop, .radial-menu-container.open'),
    );
    if (hasOpenOverlay) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      return;
    }

    // 3. Exit native landscape fullscreen playback if active on Watch page
    if (document.querySelector('.watch-container[data-fullscreen="true"]')) {
      window.dispatchEvent(new CustomEvent('vybe:exit-fullscreen'));
      return;
    }

    // 4. Navigate back in history, or flush live telemetry and exit cleanly at root
    if (canGoBack && window.location.pathname !== '/') {
      window.history.back();
    } else {
      window.dispatchEvent(new CustomEvent('vybe:app-exit'));
      window.setTimeout(() => {
        CapApp.exitApp();
      }, 180);
    }
  }).catch(() => {});
}
