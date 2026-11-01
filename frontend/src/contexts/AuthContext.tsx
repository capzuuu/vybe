import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOutSupabase,
} from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ needEmailConfirm: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  demoSignIn: (email?: string, name?: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USER_KEY = 'vybe_demo_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    let mounted = true;

    // Check if running in Supabase mode
    if (isConfigured) {
      // 1. Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch((err) => {
        console.warn('Error fetching Supabase session:', err);
        if (mounted) setLoading(false);
      });

      // 2. Listen for auth changes (Google OAuth redirect, sign in, sign out)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      // Check if demo user was saved in sessionStorage
      try {
        const storedDemo = sessionStorage.getItem(DEMO_USER_KEY);
        if (storedDemo) {
          const parsed = JSON.parse(storedDemo);
          setUser(parsed);
        }
      } catch {
        // ignore
      }
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
  }, [isConfigured]);

  const handleSignIn = async (email: string, password: string) => {
    const data = await signInWithEmail(email, password);
    setUser(data.user);
    setSession(data.session);
  };

  const handleSignUp = async (email: string, password: string, fullName?: string) => {
    const data = await signUpWithEmail(email, password, fullName);
    setUser(data.user);
    setSession(data.session);
    return {
      needEmailConfirm: !data.session && Boolean(data.user),
    };
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleSignOut = async () => {
    sessionStorage.removeItem(DEMO_USER_KEY);
    await signOutSupabase();
    setUser(null);
    setSession(null);
  };

  const demoSignIn = (email = 'viewer@vybe.stream', name = 'Demo User') => {
    const fakeUser: any = {
      id: `demo-${Date.now()}`,
      email,
      user_metadata: { full_name: name },
      app_metadata: { provider: 'email' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(fakeUser));
    } catch {
      // ignore
    }
    setUser(fakeUser);
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: Boolean(user),
    isConfigured,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signInWithGoogle: handleGoogleSignIn,
    signOut: handleSignOut,
    demoSignIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

