import { createClient } from '@supabase/supabase-js';
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

