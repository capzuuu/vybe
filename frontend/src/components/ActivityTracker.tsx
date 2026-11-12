import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  markUserOfflineKeepalive,
} from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfiles } from '../contexts/ProfileContext';
import {
  LIVE_ACTIVITY_CHANNEL,
  clearWatchingActivity,
  detachExistingTopic,
  detectPlatformLabel,
  getClientSessionId,
  getWatchingActivitySnapshot,
  markViewerOfflineInDirectory,
  safelyRemoveChannel,
  subscribeWatchingActivity,
  syncViewerDirectoryHeartbeat,
  type LivePresencePayload,
  type WatchingActivity,
} from '../services/realtimeMonitorService';

function getPresenceSemanticKey(p: LivePresencePayload): string {
  return [
    p.status,
    p.route,
    p.userId || '',
    p.isAuthenticated ? '1' : '0',
    p.profileName,
    p.profileAvatar,
    p.titleId || '',
    p.season || 0,
    p.episode || 0,
    p.platform,
  ].join('|');
}

export function ActivityTracker() {
  const { user, session, isAuthenticated } = useAuth();
  const { activeProfile } = useProfiles();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const configured = isSupabaseConfigured();

  const [watching, setWatching] = useState<WatchingActivity | null>(() =>
    getWatchingActivitySnapshot()
  );
  const [channelSubscribed, setChannelSubscribed] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const connectedAtRef = useRef<string>(new Date().toISOString());
  const prevUserIdRef = useRef<string | null>(null);
  const prevWatchKeyRef = useRef<string>('');
  const lastTrackedSemanticKeyRef = useRef<string>('');
  const trackDebounceRef = useRef<number | undefined>();
  const latestPayloadRef = useRef<LivePresencePayload | null>(null);

  const userRef = useRef(user);
  userRef.current = user;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Listen for live Watch player updates
  useEffect(() => {
    return subscribeWatchingActivity((activity) => {
      setWatching(activity);
    });
  }, []);

  // Build normalized presence snapshot
  const buildPayload = (): LivePresencePayload => {
    const isRealUser = Boolean(isAuthenticated && user?.id && !user.id.startsWith('demo-'));
    const displayName =
      (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
      activeProfile?.name ||
      (user?.email ? user.email.split('@')[0] : 'Guest Visitor');

    const isWatching = Boolean(watching && location.pathname.startsWith('/watch'));

    return {
      sessionId: getClientSessionId(),
      userId: isRealUser ? user!.id : null,
      displayName: displayName.slice(0, 60),
      profileName: activeProfile?.name || 'Alex',
      profileAvatar: activeProfile?.avatar ?? 0,
      isAuthenticated: Boolean(isAuthenticated && user?.id),
      status: isWatching ? 'watching' : 'browsing',
      route: location.pathname || '/',
      platform: detectPlatformLabel(),
      titleId: isWatching && watching ? watching.titleId : null,
      titleName: isWatching && watching ? watching.titleName : null,
      titleType: isWatching && watching ? watching.titleType : null,
      poster: isWatching && watching ? watching.poster || null : null,
      season: isWatching && watching ? watching.season ?? null : null,
      episode: isWatching && watching ? watching.episode ?? null : null,
      episodeName: isWatching && watching ? watching.episodeName || null : null,
      positionSec: isWatching && watching ? Math.max(0, Math.round(watching.positionSec)) : 0,
      durationSec: isWatching && watching ? Math.max(0, Math.round(watching.durationSec)) : 0,
      connectedAt: connectedAtRef.current,
      watchingStartedAt: isWatching && watching ? watching.startedAt : null,
      updatedAt: new Date().toISOString(),
    };
  };

  latestPayloadRef.current = buildPayload();

  // Manage single persistent Realtime Presence channel outside /admin (React StrictMode safe)
  useEffect(() => {
    if (!configured || isAdminRoute) {
      if (isAdminRoute) {
        clearWatchingActivity();
      }
      setChannelSubscribed(false);
      lastTrackedSemanticKeyRef.current = '';
      return;
    }

    let cancelled = false;
    let activeChannel: RealtimeChannel | null = null;
    let unloadSent = false;
    const sessionId = getClientSessionId();
    connectedAtRef.current = new Date().toISOString();

    const handlePageHide = () => {
      if (unloadSent) return;
      unloadSent = true;
      try {
        if (activeChannel) {
          void activeChannel.untrack();
        }
      } catch {
        // ignore teardown errors
      }
      const realUserId = userRef.current?.id;
      const accessToken = sessionRef.current?.access_token;
      if (realUserId && accessToken && !realUserId.startsWith('demo-')) {
        markUserOfflineKeepalive(realUserId, accessToken);
      }
    };

    const handlePageShow = () => {
      unloadSent = false;
    };

    const syncLiveNow = () => {
      if (cancelled || !latestPayloadRef.current) return;
      unloadSent = false;
      if (!supabase.realtime.isConnected() && !supabase.realtime.isConnecting()) {
        supabase.realtime.connect();
      }
      const refreshed = {
        ...latestPayloadRef.current,
        updatedAt: new Date().toISOString(),
      };
      latestPayloadRef.current = refreshed;
      if (activeChannel) {
        lastTrackedSemanticKeyRef.current = getPresenceSemanticKey(refreshed);
        void activeChannel.track(refreshed);
      }
      if (userRef.current?.id && !userRef.current.id.startsWith('demo-')) {
        void syncViewerDirectoryHeartbeat(userRef.current, refreshed, true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncLiveNow();
      }
    };

    const handleNetworkOnline = () => {
      syncLiveNow();
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('vybe:app-exit', handlePageHide);
    window.addEventListener('online', handleNetworkOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let appStateHandle: PluginListenerHandle | null = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (cancelled || !latestPayloadRef.current) return;

        if (isActive) {
          syncLiveNow();
        } else {
          // Persist fresh state right before Android freezes background timers
          const refreshed = {
            ...latestPayloadRef.current,
            updatedAt: new Date().toISOString(),
          };
          latestPayloadRef.current = refreshed;
          if (userRef.current?.id && !userRef.current.id.startsWith('demo-')) {
            void syncViewerDirectoryHeartbeat(userRef.current, refreshed, true);
          }
        }
      })
        .then((handle) => {
          if (cancelled) {
            void handle.remove();
          } else {
            appStateHandle = handle;
          }
        })
        .catch(() => {});
    }

    void (async () => {
      await detachExistingTopic(supabase, LIVE_ACTIVITY_CHANNEL);

      if (cancelled) return;

      const channel = supabase.channel(LIVE_ACTIVITY_CHANNEL, {
        config: {
          presence: {
            key: sessionId,
            enabled: true,
          },
        },
      });
      activeChannel = channel;
      channelRef.current = channel;

      channel.subscribe((status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          setChannelSubscribed(true);
          if (latestPayloadRef.current) {
            const fresh = {
              ...latestPayloadRef.current,
              updatedAt: new Date().toISOString(),
            };
            latestPayloadRef.current = fresh;
            lastTrackedSemanticKeyRef.current = getPresenceSemanticKey(fresh);
            void channel.track(fresh);
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setChannelSubscribed(false);
        }
      });
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(trackDebounceRef.current);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('vybe:app-exit', handlePageHide);
      window.removeEventListener('online', handleNetworkOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (appStateHandle) {
        void appStateHandle.remove();
        appStateHandle = null;
      }
      setChannelSubscribed(false);
      lastTrackedSemanticKeyRef.current = '';
      if (activeChannel) {
        try {
          void activeChannel.untrack();
        } catch {
          // ignore
        }
        void safelyRemoveChannel(supabase, activeChannel);
        if (channelRef.current === activeChannel) {
          channelRef.current = null;
        }
      }
    };
  }, [configured, isAdminRoute]);

  // Mark previous user offline cleanly on sign-out
  useEffect(() => {
    const currentId = user?.id && !user.id.startsWith('demo-') ? user.id : null;
    if (prevUserIdRef.current && prevUserIdRef.current !== currentId) {
      void markViewerOfflineInDirectory(prevUserIdRef.current);
    }
    prevUserIdRef.current = currentId;
  }, [user?.id]);

  // Track presence updates (coalesced across fast route+player transitions; ignores 15s progress ticks)
  useEffect(() => {
    if (!configured || isAdminRoute) return;

    const payload = buildPayload();
    latestPayloadRef.current = payload;

    const semanticKey = getPresenceSemanticKey(payload);
    const watchKey = `${payload.status}|${payload.titleId || ''}|${payload.season || 0}|${payload.episode || 0}`;
    const watchTransitioned = watchKey !== prevWatchKeyRef.current;
    prevWatchKeyRef.current = watchKey;

    if (user?.id && !user.id.startsWith('demo-')) {
      void syncViewerDirectoryHeartbeat(user, payload, watchTransitioned);
    }

    if (channelSubscribed && channelRef.current && semanticKey !== lastTrackedSemanticKeyRef.current) {
      window.clearTimeout(trackDebounceRef.current);
      // Wait 90ms so /watch route mount + reportWatchingActivity collapse into one track() update
      const delayMs = payload.route.startsWith('/watch') && payload.status !== 'watching' ? 140 : 80;
      trackDebounceRef.current = window.setTimeout(() => {
        if (!channelRef.current || !latestPayloadRef.current) return;
        const latestKey = getPresenceSemanticKey(latestPayloadRef.current);
        if (latestKey !== lastTrackedSemanticKeyRef.current) {
          lastTrackedSemanticKeyRef.current = latestKey;
          const fresh = {
            ...latestPayloadRef.current,
            updatedAt: new Date().toISOString(),
          };
          latestPayloadRef.current = fresh;
          void channelRef.current.track(fresh);
        }
      }, delayMs);
    }
  }, [
    configured,
    isAdminRoute,
    channelSubscribed,
    isAuthenticated,
    user?.id,
    user?.email,
    activeProfile?.id,
    activeProfile?.name,
    activeProfile?.avatar,
    location.pathname,
    watching,
  ]);

  // Keep user online while browser tab stays open (foreground or backgrounded!)
  useEffect(() => {
    if (!configured || isAdminRoute) return;

    let tickCount = 0;
    const interval = window.setInterval(() => {
      tickCount += 1;
      if (!latestPayloadRef.current) return;

      const refreshed = {
        ...latestPayloadRef.current,
        updatedAt: new Date().toISOString(),
      };
      latestPayloadRef.current = refreshed;

      const currentUser = userRef.current;
      if (currentUser?.id && !currentUser.id.startsWith('demo-')) {
        void syncViewerDirectoryHeartbeat(currentUser, refreshed, false);
      }

      // Sync progress position anchor to Presence gently every ~50s (avoids phx_ref churn)
      if (tickCount % 2 === 0 && channelSubscribed && channelRef.current) {
        lastTrackedSemanticKeyRef.current = getPresenceSemanticKey(refreshed);
        void channelRef.current.track(refreshed);
      }
    }, 25000);

    return () => window.clearInterval(interval);
  }, [configured, isAdminRoute, channelSubscribed]);

  return null;
}
