import { Capacitor } from '@capacitor/core';
import type { SupabaseClient, User, RealtimeChannel } from '@supabase/supabase-js';
import {
  supabase,
  getAdminSupabase,
  getConfiguredAdminEmail,
  isSupabaseConfigured,
  recordApkDownloadKeepalive,
} from '../lib/supabase';

export const LIVE_ACTIVITY_CHANNEL = 'vybe:live-activity';
export const ONLINE_STALE_MS = 120_000;
export const APK_VERSION = '1.0';

export type ApkDownloadSource = 'popup' | 'footer' | 'profile_menu' | 'direct' | 'unknown';

export interface ApkDownloadRow {
  id: number;
  user_id: string | null;
  source: ApkDownloadSource;
  platform: string;
  app_version: string;
  user_agent: string;
  session_id: string | null;
  created_at: string;
}

export interface WatchingActivity {
  titleId: string;
  titleName: string;
  titleType: 'movie' | 'series';
  poster?: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  positionSec: number;
  durationSec: number;
  startedAt: string;
}

export interface LivePresencePayload {
  sessionId: string;
  userId: string | null;
  displayName: string;
  profileName: string;
  profileAvatar: number;
  isAuthenticated: boolean;
  status: 'browsing' | 'watching';
  route: string;
  platform: string;
  titleId: string | null;
  titleName: string | null;
  titleType: 'movie' | 'series' | null;
  poster: string | null;
  season: number | null;
  episode: number | null;
  episodeName: string | null;
  positionSec: number;
  durationSec: number;
  connectedAt: string;
  watchingStartedAt: string | null;
  updatedAt: string;
}

export interface UserDirectoryRow {
  user_id: string;
  email: string;
  full_name: string;
  provider: string;
  active_profile_name: string | null;
  active_profile_avatar: number;
  is_online: boolean;
  is_watching: boolean;
  current_route: string;
  current_title_id: string | null;
  current_title_name: string | null;
  current_title_type: 'movie' | 'series' | null;
  current_poster: string | null;
  current_season: number | null;
  current_episode: number | null;
  current_episode_name: string | null;
  current_position: number;
  current_duration: number;
  platform: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface AdminUserProfileRow {
  id: string;
  user_id: string;
  name: string;
  avatar: number;
  is_kids: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserLibraryRow {
  user_id: string;
  profile_id: string;
  title_id: string;
  in_watchlist: boolean;
  is_liked: boolean;
  position: number;
  duration: number;
  updated_at: string;
}

export interface AdminVerificationResult {
  authorized: boolean;
  tableMissing: boolean;
  adminEmail?: string;
  reason?: string;
}

export interface AdminSnapshotResult {
  directory: UserDirectoryRow[];
  profiles: AdminUserProfileRow[];
  library: AdminUserLibraryRow[];
  apkDownloads: ApkDownloadRow[];
  apkDownloadsTotalCount: number;
  apkDownloadsMissing: boolean;
  schemaMissing: boolean;
  error?: string;
}

export type RealtimeConnectionStatus =
  | 'CONNECTING'
  | 'SUBSCRIBED'
  | 'TIMED_OUT'
  | 'CHANNEL_ERROR'
  | 'CLOSED';

// ── Watching State Store (Shared cleanly between Watch.tsx and ActivityTracker) ──

let currentWatchingActivity: WatchingActivity | null = null;
const watchingListeners = new Set<(activity: WatchingActivity | null) => void>();

export function reportWatchingActivity(activity: WatchingActivity): void {
  currentWatchingActivity = { ...activity };
  watchingListeners.forEach((fn) => fn(currentWatchingActivity));
}

export function clearWatchingActivity(onlyIfTitleId?: string): void {
  if (!currentWatchingActivity) return;
  if (onlyIfTitleId && currentWatchingActivity.titleId !== onlyIfTitleId) return;
  currentWatchingActivity = null;
  watchingListeners.forEach((fn) => fn(null));
}

export function getWatchingActivitySnapshot(): WatchingActivity | null {
  return currentWatchingActivity;
}

export function subscribeWatchingActivity(
  listener: (activity: WatchingActivity | null) => void
): () => void {
  watchingListeners.add(listener);
  return () => {
    watchingListeners.delete(listener);
  };
}

// ── Client Identity & Platform Helpers ──────────────────────────────────────

const SESSION_KEY_STORAGE = 'vybe_live_session_id';

export function getClientSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY_STORAGE);
    if (existing && existing.length >= 8) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `vybe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem(SESSION_KEY_STORAGE, generated);
    return generated;
  } catch {
    return `vybe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function detectPlatformLabel(): string {
  try {
    if (Capacitor.isNativePlatform()) {
      const plat = Capacitor.getPlatform();
      if (plat === 'android') return 'Android App';
      if (plat === 'ios') return 'iOS App';
      return 'Native App';
    }
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'Android Mobile Web';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS Web';
    if (/Mobile|Tablet/i.test(ua)) return 'Mobile Web';
    return 'Desktop Web';
  } catch {
    return 'Web';
  }
}

function isMissingRelationError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    code === '42P01' ||
    (err as any).status === 404 ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table')
  );
}

let activeViewerUserId: string | null = null;
let activeViewerAccessToken: string | undefined = undefined;
const lastApkTrackBySource = new Map<ApkDownloadSource, number>();

export function setActiveViewerAuthContext(
  userId: string | null | undefined,
  accessToken?: string
): void {
  activeViewerUserId = userId && !userId.startsWith('demo-') ? userId : null;
  activeViewerAccessToken = activeViewerUserId ? accessToken : undefined;
}

export function trackApkDownload(source: ApkDownloadSource): void {
  if (!isSupabaseConfigured() || Capacitor.isNativePlatform()) return;

  const now = Date.now();
  const prevAt = lastApkTrackBySource.get(source) || 0;
  if (now - prevAt < 3000) return;
  lastApkTrackBySource.set(source, now);

  const userId = activeViewerUserId && activeViewerAccessToken ? activeViewerUserId : null;
  const accessToken = userId ? activeViewerAccessToken : undefined;

  recordApkDownloadKeepalive(
    {
      user_id: userId,
      source,
      platform: detectPlatformLabel(),
      app_version: APK_VERSION,
      user_agent: (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '').slice(0, 250),
      session_id: getClientSessionId(),
    },
    accessToken
  );
}

// ── Viewer Directory Heartbeat (Authenticated Real Users) ───────────────────

let directoryTableAvailable: boolean | null = null;
let lastDirectorySyncMs = 0;
let lastDirectoryWatchingKey = '';

export async function syncViewerDirectoryHeartbeat(
  user: User | null,
  payload: LivePresencePayload,
  force = false
): Promise<void> {
  if (!isSupabaseConfigured() || !user?.id || user.id.startsWith('demo-')) return;
  if (directoryTableAvailable === false) return;

  const watchKey = `${user.id}|${payload.status}|${payload.route}|${payload.titleId || ''}|${payload.season || 0}|${payload.episode || 0}|${payload.profileName}`;
  const now = Date.now();
  const minInterval = 15000;

  if (!force && watchKey === lastDirectoryWatchingKey && now - lastDirectorySyncMs < minInterval) {
    return;
  }

  lastDirectorySyncMs = now;
  lastDirectoryWatchingKey = watchKey;

  try {
    const { error } = await supabase.from('user_directory').upsert(
      {
        user_id: user.id,
        email: user.email || '',
        full_name:
          (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
          payload.displayName ||
          'Vybe Member',
        provider:
          (typeof user.app_metadata?.provider === 'string' && user.app_metadata.provider) ||
          'email',
        active_profile_name: payload.profileName || null,
        active_profile_avatar: Math.max(0, Math.min(20, Math.trunc(payload.profileAvatar || 0))),
        is_online: true,
        is_watching: payload.status === 'watching',
        current_route: payload.route.slice(0, 120),
        current_title_id: payload.titleId,
        current_title_name: payload.titleName,
        current_title_type: payload.titleType,
        current_poster: payload.poster,
        current_season: payload.season,
        current_episode: payload.episode,
        current_episode_name: payload.episodeName,
        current_position: Math.max(0, Math.round(payload.positionSec || 0)),
        current_duration: Math.max(0, Math.round(payload.durationSec || 0)),
        platform: payload.platform,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      if (isMissingRelationError(error)) {
        directoryTableAvailable = false;
      }
    } else {
      directoryTableAvailable = true;
    }
  } catch {
    // Non-fatal telemetry failure; Realtime Presence still continues cleanly
  }
}

export async function markViewerOfflineInDirectory(userId: string | null | undefined): Promise<void> {
  if (!isSupabaseConfigured() || !userId || userId.startsWith('demo-')) return;
  lastDirectorySyncMs = 0;
  lastDirectoryWatchingKey = '';
  if (directoryTableAvailable === false) return;
  try {
    await supabase
      .from('user_directory')
      .update({
        is_online: false,
        is_watching: false,
        current_title_id: null,
        current_title_name: null,
        current_title_type: null,
        current_poster: null,
        current_season: null,
        current_episode: null,
        current_episode_name: null,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } catch {
    // Ignore errors during teardown/offline transitions
  }
}

// ── Admin Verification & Data Queries ───────────────────────────────────────

export async function verifyAdminAccess(user: User | null): Promise<AdminVerificationResult> {
  if (!user?.id) {
    return { authorized: false, tableMissing: false, reason: 'Not signed in.' };
  }

  const configuredEmail = getConfiguredAdminEmail();
  const userEmail = (user.email || '').trim().toLowerCase();

  if (configuredEmail && userEmail !== configuredEmail) {
    return {
      authorized: false,
      tableMissing: false,
      reason: 'Access denied. Only the single designated Admin login can access this dashboard.',
    };
  }

  const adminClient = getAdminSupabase();
  try {
    const { data, error } = await adminClient
      .from('admin_users')
      .select('user_id, email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        const hasClaim = (user.app_metadata as any)?.role === 'admin';
        const matchesEnv = Boolean(configuredEmail && userEmail === configuredEmail);
        if (hasClaim || matchesEnv) {
          return {
            authorized: true,
            tableMissing: true,
            adminEmail: user.email || undefined,
            reason:
              'Admin tables (supabase/admin_dashboard.sql) have not been executed yet in Supabase SQL Editor.',
          };
        }
        return {
          authorized: false,
          tableMissing: true,
          reason:
            'Admin SQL setup is required: Run supabase/admin_dashboard.sql in Supabase SQL Editor and register your 1 admin email in public.admin_users.',
        };
      }

      if ((user.app_metadata as any)?.role === 'admin') {
        return { authorized: true, tableMissing: false, adminEmail: user.email || undefined };
      }

      return {
        authorized: false,
        tableMissing: false,
        reason: 'Unable to verify admin privileges. Please check your Supabase configuration.',
      };
    }

    if (data?.user_id === user.id) {
      return {
        authorized: true,
        tableMissing: false,
        adminEmail: data.email || user.email || undefined,
      };
    }

    if ((user.app_metadata as any)?.role === 'admin') {
      return {
        authorized: true,
        tableMissing: false,
        adminEmail: user.email || undefined,
      };
    }

    return {
      authorized: false,
      tableMissing: false,
      reason:
        'Access denied. This account is not registered as the single Vybe Admin user.',
    };
  } catch {
    return {
      authorized: false,
      tableMissing: false,
      reason: 'Unable to verify administrator credentials right now.',
    };
  }
}

export async function fetchAdminSnapshot(): Promise<AdminSnapshotResult> {
  if (!isSupabaseConfigured()) {
    return {
      directory: [],
      profiles: [],
      library: [],
      apkDownloads: [],
      apkDownloadsTotalCount: 0,
      apkDownloadsMissing: false,
      schemaMissing: false,
      error: 'Supabase credentials are not configured.',
    };
  }

  const adminClient = getAdminSupabase();
  try {
    const [dirRes, profRes, libRes, dlRes] = await Promise.all([
      adminClient
        .from('user_directory')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(1000),
      adminClient
        .from('user_profiles')
        .select('id, user_id, name, avatar, is_kids, created_at, updated_at')
        .order('created_at', { ascending: true })
        .limit(3000),
      adminClient
        .from('user_library')
        .select('user_id, profile_id, title_id, in_watchlist, is_liked, position, duration, updated_at')
        .order('updated_at', { ascending: false })
        .limit(3000),
      adminClient
        .from('apk_downloads')
        .select('id, user_id, source, platform, app_version, user_agent, session_id, created_at', {
          count: 'exact',
        })
        .order('created_at', { ascending: false })
        .limit(250),
    ]);

    const dirMissing = isMissingRelationError(dirRes.error);
    const dlMissing = isMissingRelationError(dlRes.error);
    const dlRows = Array.isArray(dlRes.data) ? (dlRes.data as ApkDownloadRow[]) : [];
    const dlTotal = typeof dlRes.count === 'number' ? dlRes.count : dlRows.length;

    if (dirMissing) {
      return {
        directory: [],
        profiles: Array.isArray(profRes.data) ? (profRes.data as AdminUserProfileRow[]) : [],
        library: Array.isArray(libRes.data) ? (libRes.data as AdminUserLibraryRow[]) : [],
        apkDownloads: dlRows,
        apkDownloadsTotalCount: dlTotal,
        apkDownloadsMissing: dlMissing,
        schemaMissing: true,
      };
    }

    const nonMissingDlError = dlRes.error && !dlMissing ? dlRes.error : null;
    const firstError = dirRes.error || profRes.error || libRes.error || nonMissingDlError;

    return {
      directory: Array.isArray(dirRes.data) ? (dirRes.data as UserDirectoryRow[]) : [],
      profiles: Array.isArray(profRes.data) ? (profRes.data as AdminUserProfileRow[]) : [],
      library: Array.isArray(libRes.data) ? (libRes.data as AdminUserLibraryRow[]) : [],
      apkDownloads: dlRows,
      apkDownloadsTotalCount: dlTotal,
      apkDownloadsMissing: dlMissing,
      schemaMissing: false,
      error: firstError ? firstError.message : undefined,
    };
  } catch (err: any) {
    return {
      directory: [],
      profiles: [],
      library: [],
      apkDownloads: [],
      apkDownloadsTotalCount: 0,
      apkDownloadsMissing: false,
      schemaMissing: false,
      error: err?.message || 'Failed to load admin telemetry.',
    };
  }
}

// ── Admin Realtime Channel Subscription (Presence + Postgres Changes) ────────

export interface AdminRealtimeCallbacks {
  onPresenceSync: (presences: LivePresencePayload[]) => void;
  onPresenceJoin?: (key: string, presences: LivePresencePayload[]) => void;
  onPresenceLeave?: (key: string, presences: LivePresencePayload[]) => void;
  onDirectoryEvent?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', newRow: UserDirectoryRow | null, oldRow: Partial<UserDirectoryRow> | null) => void;
  onProfileEvent?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', newRow: AdminUserProfileRow | null, oldRow: Partial<AdminUserProfileRow> | null) => void;
  onLibraryEvent?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', newRow: AdminUserLibraryRow | null, oldRow: Partial<AdminUserLibraryRow> | null) => void;
  onApkDownloadEvent?: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', newRow: ApkDownloadRow | null, oldRow: Partial<ApkDownloadRow> | null) => void;
  onStatusChange?: (status: RealtimeConnectionStatus) => void;
}

function extractPresenceList(channel: RealtimeChannel): LivePresencePayload[] {
  const rawState = channel.presenceState<LivePresencePayload>();
  const list: LivePresencePayload[] = [];

  for (const entries of Object.values(rawState)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    // Use the freshest tracked snapshot per presence key
    const latest = entries.reduce((best, curr) => {
      const bestTime = Date.parse(best?.updatedAt || '') || 0;
      const currTime = Date.parse(curr?.updatedAt || '') || 0;
      return currTime >= bestTime ? curr : best;
    }, entries[0]);

    if (latest && typeof latest.sessionId === 'string') {
      list.push(latest);
    }
  }

  return list.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'watching' ? -1 : 1;
    return (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0);
  });
}

const pendingChannelRemovals = new WeakMap<RealtimeChannel, Promise<unknown>>();

export async function safelyRemoveChannel(
  client: SupabaseClient,
  channel: RealtimeChannel
): Promise<void> {
  let pending = pendingChannelRemovals.get(channel);
  if (!pending) {
    pending = client.removeChannel(channel).catch(() => 'error');
    pendingChannelRemovals.set(channel, pending);
  }
  await pending;
}

export async function detachExistingTopic(
  client: SupabaseClient,
  topic: string
): Promise<void> {
  const fullTopic = `realtime:${topic}`;
  const existing = client.getChannels().filter((ch) => ch.topic === fullTopic);
  for (const ch of existing) {
    await safelyRemoveChannel(client, ch);
  }
  if (existing.length > 0) {
    // Allow teardown microtask to finish removing topic before re-creating the channel
    await Promise.resolve();
  }
}

export function subscribeAdminRealtime(callbacks: AdminRealtimeCallbacks): () => void {
  if (!isSupabaseConfigured()) {
    callbacks.onStatusChange?.('CLOSED');
    return () => {};
  }

  const adminClient = getAdminSupabase();
  const monitorTabId = Math.random().toString(36).slice(2, 9);
  let disposed = false;
  let presenceChannel: RealtimeChannel | null = null;
  let dbChannel: RealtimeChannel | null = null;
  let hasSyncedPresence = false;
  let emptySyncFallbackTimer: number | undefined;

  callbacks.onStatusChange?.('CONNECTING');

  void (async () => {
    await detachExistingTopic(adminClient, LIVE_ACTIVITY_CHANNEL);
    if (disposed) return;

    const pChannel = adminClient.channel(LIVE_ACTIVITY_CHANNEL, {
      config: {
        presence: {
          key: `admin-observer-${monitorTabId}`,
          enabled: true,
        },
      },
    });
    presenceChannel = pChannel;

    pChannel
      .on('presence', { event: 'sync' }, () => {
        if (disposed) return;
        hasSyncedPresence = true;
        if (emptySyncFallbackTimer !== undefined) {
          window.clearTimeout(emptySyncFallbackTimer);
          emptySyncFallbackTimer = undefined;
        }
        callbacks.onPresenceSync(extractPresenceList(pChannel));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (disposed) return;
        const valid = ((newPresences || []) as unknown[]).filter(
          (p): p is LivePresencePayload => Boolean(p && typeof (p as any).sessionId === 'string')
        );
        if (valid.length > 0) {
          callbacks.onPresenceJoin?.(key, valid);
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (disposed) return;
        const valid = ((leftPresences || []) as unknown[]).filter(
          (p): p is LivePresencePayload => Boolean(p && typeof (p as any).sessionId === 'string')
        );
        if (valid.length > 0) {
          callbacks.onPresenceLeave?.(key, valid);
        }
      })
      .subscribe((status) => {
        if (disposed) return;
        if (status === 'SUBSCRIBED') {
          callbacks.onStatusChange?.('SUBSCRIBED');
          // Wait briefly for server's initial presence_state sync before seeding an empty baseline
          if (!hasSyncedPresence && emptySyncFallbackTimer === undefined) {
            emptySyncFallbackTimer = window.setTimeout(() => {
              if (!disposed && !hasSyncedPresence) {
                hasSyncedPresence = true;
                callbacks.onPresenceSync(extractPresenceList(pChannel));
              }
            }, 1500);
          }
        } else if (status === 'TIMED_OUT') {
          callbacks.onStatusChange?.('TIMED_OUT');
        } else if (status === 'CHANNEL_ERROR') {
          callbacks.onStatusChange?.('CHANNEL_ERROR');
        } else if (status === 'CLOSED') {
          callbacks.onStatusChange?.('CLOSED');
        }
      });

    const dChannel = adminClient
      .channel(`vybe:admin-db-${monitorTabId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_directory' },
        (payload) => {
          if (disposed) return;
          callbacks.onDirectoryEvent?.(
            payload.eventType,
            (payload.new && Object.keys(payload.new).length > 0
              ? (payload.new as UserDirectoryRow)
              : null),
            (payload.old && Object.keys(payload.old).length > 0
              ? (payload.old as Partial<UserDirectoryRow>)
              : null)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles' },
        (payload) => {
          if (disposed) return;
          callbacks.onProfileEvent?.(
            payload.eventType,
            (payload.new && Object.keys(payload.new).length > 0
              ? (payload.new as AdminUserProfileRow)
              : null),
            (payload.old && Object.keys(payload.old).length > 0
              ? (payload.old as Partial<AdminUserProfileRow>)
              : null)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_library' },
        (payload) => {
          if (disposed) return;
          callbacks.onLibraryEvent?.(
            payload.eventType,
            (payload.new && Object.keys(payload.new).length > 0
              ? (payload.new as AdminUserLibraryRow)
              : null),
            (payload.old && Object.keys(payload.old).length > 0
              ? (payload.old as Partial<AdminUserLibraryRow>)
              : null)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'apk_downloads' },
        (payload) => {
          if (disposed) return;
          callbacks.onApkDownloadEvent?.(
            payload.eventType,
            (payload.new && Object.keys(payload.new).length > 0
              ? (payload.new as ApkDownloadRow)
              : null),
            (payload.old && Object.keys(payload.old).length > 0
              ? (payload.old as Partial<ApkDownloadRow>)
              : null)
          );
        }
      )
      .subscribe();
    dbChannel = dChannel;
  })();

  return () => {
    disposed = true;
    if (emptySyncFallbackTimer !== undefined) {
      window.clearTimeout(emptySyncFallbackTimer);
      emptySyncFallbackTimer = undefined;
    }
    if (presenceChannel) {
      void safelyRemoveChannel(adminClient, presenceChannel);
      presenceChannel = null;
    }
    if (dbChannel) {
      void safelyRemoveChannel(adminClient, dbChannel);
      dbChannel = null;
    }
  };
}
