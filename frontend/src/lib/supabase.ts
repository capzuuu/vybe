import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const NATIVE_AUTH_SCHEME = 'app.vybe.stream';
export const NATIVE_AUTH_CALLBACK_URL = `${NATIVE_AUTH_SCHEME}://login-callback`;

// Read configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bsnwcggmmekuhiiprftg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Checks if a valid Supabase anon key is configured.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseAnonKey.trim().length > 10);
};

/**
 * Singleton Supabase client instance.
 * Safe fallback placeholder if key is not yet pasted in .env so the app never crashes.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder-anon-key-configure-in-env',
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'vybe_auth_token',
    },
  }
);

let adminClientInstance: SupabaseClient | null = null;

/**
 * Isolated Supabase client exclusively for the separate /admin dashboard.
 * Uses a separate storageKey and disables URL session detection so admin
 * sign-ins never interfere with regular viewer sessions or OAuth callbacks.
 */
export function getAdminSupabase(): SupabaseClient {
  if (!adminClientInstance) {
    adminClientInstance = createClient(
      supabaseUrl,
      supabaseAnonKey || 'placeholder-anon-key-configure-in-env',
      {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: 'vybe_admin_auth_token',
        },
      }
    );
  }
  return adminClientInstance;
}

export function getConfiguredAdminEmail(): string | null {
  const raw = import.meta.env.VITE_ADMIN_EMAIL;
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().toLowerCase();
  return cleaned.length > 0 ? cleaned : null;
}

export async function signInAdminWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase Anon Key is not configured in frontend/.env');
  }
  const client = getAdminSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOutAdminSupabase() {
  if (isSupabaseConfigured()) {
    try {
      await getAdminSupabase().auth.signOut();
    } catch (err) {
      console.warn('Admin Supabase signOut error:', err);
    }
  }
}

export interface AuthErrorResponse {
  message: string;
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase Anon Key is not configured in frontend/.env');
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign up with Email, Password and optional Full Name
 */
export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase Anon Key is not configured in frontend/.env');
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || email.split('@')[0],
      },
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sign in or Register using Google OAuth
 */
export async function signInWithGoogle() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase Anon Key is not configured in frontend/.env');
  }

  const isNative = Capacitor.isNativePlatform();
  const redirectTo = isNative ? NATIVE_AUTH_CALLBACK_URL : `${window.location.origin}/`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: isNative,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw error;

  if (isNative && data?.url) {
    await Browser.open({
      url: data.url,
      toolbarColor: '#141414',
    });
  }

  return data;
}

/**
 * Sign out of current Supabase session
 */
export async function signOutSupabase() {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    }
  }
}

/**
 * Best-effort keepalive PATCH on tab/browser close so authenticated users are
 * marked offline immediately in public.user_directory even while the page unloads.
 */
export function markUserOfflineKeepalive(userId: string, accessToken: string | undefined): void {
  if (!isSupabaseConfigured() || !userId || !accessToken || userId.startsWith('demo-')) return;
  try {
    const nowIso = new Date().toISOString();
    const endpoint = `${supabaseUrl}/rest/v1/user_directory?user_id=eq.${encodeURIComponent(userId)}`;
    void fetch(endpoint, {
      method: 'PATCH',
      keepalive: true,
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        is_online: false,
        is_watching: false,
        current_title_id: null,
        current_title_name: null,
        current_title_type: null,
        current_poster: null,
        current_season: null,
        current_episode: null,
        current_episode_name: null,
        last_seen_at: nowIso,
        updated_at: nowIso,
      }),
    });
  } catch {
    // Ignore unload transport errors
  }
}

export interface ApkDownloadInsertPayload {
  user_id: string | null;
  source: 'popup' | 'footer' | 'profile_menu' | 'direct' | 'unknown';
  platform: string;
  app_version: string;
  user_agent: string;
  session_id: string | null;
}

/**
 * Best-effort keepalive POST to log an Android APK download in public.apk_downloads
 * without blocking or delaying the browser/download manager.
 */
export function recordApkDownloadKeepalive(
  payload: ApkDownloadInsertPayload,
  accessToken?: string
): void {
  if (!isSupabaseConfigured()) return;
  try {
    const endpoint = `${supabaseUrl}/rest/v1/apk_downloads`;
    const authBearer = accessToken || supabaseAnonKey;
    void fetch(endpoint, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${authBearer}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-fatal download telemetry error
  }
}

