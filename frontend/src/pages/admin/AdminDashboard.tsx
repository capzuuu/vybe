import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Film,
  Heart,
  ListChecks,
  LogOut,
  Monitor,
  Play,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Tv,
  UserCheck,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Logo } from '../../components/ui/TitleArt';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { SmartImage } from '../../components/ui/SmartImage';
import { AdminLoginView } from '../../components/admin/AdminLoginView';
import { useCatalog } from '../../contexts/CatalogContext';
import { fetchTitleById } from '../../services/tmdbService';
import {
  getAdminSupabase,
  isSupabaseConfigured,
  signOutAdminSupabase,
} from '../../lib/supabase';
import {
  ONLINE_STALE_MS,
  fetchAdminSnapshot,
  subscribeAdminRealtime,
  verifyAdminAccess,
  type AdminUserLibraryRow,
  type AdminUserProfileRow,
  type ApkDownloadRow,
  type ApkDownloadSource,
  type LivePresencePayload,
  type RealtimeConnectionStatus,
  type UserDirectoryRow,
} from '../../services/realtimeMonitorService';
import type { Title } from '../../types';
import './adminDashboard.css';

interface FeedEvent {
  id: string;
  kind: 'watch' | 'online' | 'leave' | 'db' | 'download';
  title: string;
  detail: string;
  at: number;
}

interface VerifiedAdminState {
  user: User;
  adminEmail: string;
  tableMissing: boolean;
  notice?: string;
}

type WatchFilter = 'all' | 'series' | 'movies' | 'android';
type ActiveTab = 'all' | 'watching' | 'browsing' | 'android' | 'signedin' | 'guests';
type DirectoryFilter = 'all' | 'online' | 'watching' | 'android' | 'offline';
type ApkSourceFilter = 'all' | ApkDownloadSource;

function formatClockDuration(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatRelativeAge(isoOrMs: string | number | null | undefined, nowMs: number): string {
  if (!isoOrMs) return '—';
  const ms = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs);
  if (!Number.isFinite(ms)) return '—';
  const diffSec = Math.max(0, Math.floor((nowMs - ms) / 1000));
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRouteLabel(route: string): string {
  if (!route || route === '/') return 'Home';
  if (route.startsWith('/watch/')) return 'Player';
  if (route === '/tv') return 'TV Shows';
  if (route === '/movies') return 'Movies';
  if (route === '/kdrama') return 'K-Drama';
  if (route === '/latest') return 'New & Popular';
  if (route === '/community') return 'Community';
  if (route === '/my-list') return 'My List';
  if (route === '/search') return 'Search';
  if (route === '/profiles') return 'Profiles';
  if (route === '/account') return 'Account';
  if (route === '/settings') return 'Settings';
  return route.replace(/^\//, '');
}

function formatFallbackTitleLabel(titleId: string): string {
  if (!titleId) return 'Unknown Title';
  const parts = titleId.split('-');
  if (parts.length >= 2) {
    const kind = parts[0] === 'series' ? 'Series' : 'Movie';
    return `${kind} #${parts[1]}`;
  }
  return titleId;
}

function isAndroidAppPlatform(platform: string | null | undefined): boolean {
  return (platform || '').toLowerCase().includes('android app');
}

function formatApkSourceLabel(source: string | null | undefined): string {
  switch (source) {
    case 'popup':
      return 'Android Popup';
    case 'footer':
      return 'Footer Button';
    case 'profile_menu':
      return 'Profile Menu';
    case 'direct':
      return 'Direct Link';
    default:
      return 'Web';
  }
}

function formatTimestampShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDeviceHint(ua: string | null | undefined, platform: string): string {
  const raw = ua || '';
  const androidVer = raw.match(/Android\s+([\d.]+)/i)?.[1];
  if (androidVer) return `Android ${androidVer}`;
  if (/Edg\//i.test(raw)) return `${platform} · Edge`;
  if (/Chrome\//i.test(raw)) return `${platform} · Chrome`;
  if (/Firefox\//i.test(raw)) return `${platform} · Firefox`;
  if (/Safari\//i.test(raw)) return `${platform} · Safari`;
  return platform || 'Web';
}

function PlatformIcon({ platform }: { platform: string }) {
  const lower = (platform || '').toLowerCase();
  if (lower.includes('android') || lower.includes('ios') || lower.includes('mobile')) {
    return <Smartphone size={13} aria-hidden="true" />;
  }
  return <Monitor size={13} aria-hidden="true" />;
}

export function AdminDashboard() {
  const configured = isSupabaseConfigured();
  const { getTitle } = useCatalog();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [verifiedAdmin, setVerifiedAdmin] = useState<VerifiedAdminState | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [rtStatus, setRtStatus] = useState<RealtimeConnectionStatus>('CONNECTING');
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const [livePresences, setLivePresences] = useState<LivePresencePayload[]>([]);
  const [directory, setDirectory] = useState<UserDirectoryRow[]>([]);
  const [profiles, setProfiles] = useState<AdminUserProfileRow[]>([]);
  const [library, setLibrary] = useState<AdminUserLibraryRow[]>([]);
  const [apkDownloads, setApkDownloads] = useState<ApkDownloadRow[]>([]);
  const [apkDownloadsTotalCount, setApkDownloadsTotalCount] = useState(0);
  const [apkDownloadsMissing, setApkDownloadsMissing] = useState(false);
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);

  // Interactive UI controls
  const [watchFilter, setWatchFilter] = useState<WatchFilter>('all');
  const [watchSearch, setWatchSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [directoryFilter, setDirectoryFilter] = useState<DirectoryFilter>('all');
  const [directorySearch, setDirectorySearch] = useState('');
  const [apkSourceFilter, setApkSourceFilter] = useState<ApkSourceFilter>('all');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Isolate admin route metadata cleanly (prevent indexing / restore title on leave)
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Vybe Admin — Live Operations & Telemetry';

    let robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const createdMeta = !robotsMeta;
    const prevContent = robotsMeta?.getAttribute('content') || null;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.content = 'noindex, nofollow, noarchive';

    return () => {
      document.title = prevTitle;
      if (createdMeta) {
        robotsMeta?.remove();
      } else if (robotsMeta) {
        if (prevContent === null) {
          robotsMeta.removeAttribute('content');
        } else {
          robotsMeta.content = prevContent;
        }
      }
    };
  }, []);

  // Ticking clock for smooth live progress bars & elapsed duration indicators
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Lazy title metadata cache for resolving historical watch IDs
  const [resolvedTitles, setResolvedTitles] = useState<Record<string, Title>>({});
  const fetchingTitleIdsRef = useRef<Set<string>>(new Set());
  const apkSectionRef = useRef<HTMLElement | null>(null);

  const prevPresenceMapRef = useRef<Map<string, LivePresencePayload>>(new Map());
  const prevDirectoryMapRef = useRef<Map<string, UserDirectoryRow>>(new Map());
  const prevLibraryMapRef = useRef<Map<string, AdminUserLibraryRow>>(new Map());
  const apkDownloadIdsRef = useRef<Set<number>>(new Set());
  const recentFeedDedupRef = useRef<Map<string, number>>(new Map());
  const hasInitialPresenceSyncRef = useRef<boolean>(false);
  const getTitleRef = useRef(getTitle);
  getTitleRef.current = getTitle;

  const pushFeedEvent = useCallback((event: Omit<FeedEvent, 'id' | 'at'>) => {
    const entry: FeedEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
    };
    setFeedEvents((prev) => [entry, ...prev].slice(0, 40));
  }, []);

  const pushDedupFeedEvent = useCallback(
    (dedupKey: string, event: Omit<FeedEvent, 'id' | 'at'>, windowMs = 6000) => {
      const now = Date.now();
      const prevAt = recentFeedDedupRef.current.get(dedupKey) || 0;
      if (now - prevAt < windowMs) return;
      recentFeedDedupRef.current.set(dedupKey, now);
      if (recentFeedDedupRef.current.size > 150) {
        for (const [k, ts] of recentFeedDedupRef.current.entries()) {
          if (now - ts > 30000) recentFeedDedupRef.current.delete(k);
        }
      }
      pushFeedEvent(event);
    },
    [pushFeedEvent]
  );

  // Verify single-admin session on mount & auth transitions
  const evaluateAdminSession = useCallback(async (user: User | null) => {
    if (!user) {
      setVerifiedAdmin(null);
      setCheckingAuth(false);
      return;
    }

    setCheckingAuth(true);
    const verification = await verifyAdminAccess(user);
    if (verification.authorized) {
      setAuthError(null);
      setVerifiedAdmin({
        user,
        adminEmail: verification.adminEmail || user.email || 'Admin',
        tableMissing: verification.tableMissing,
        notice: verification.reason,
      });
      if (verification.tableMissing) {
        setSchemaMissing(true);
      }
    } else {
      await signOutAdminSupabase();
      setVerifiedAdmin(null);
      setAuthError(verification.reason || 'Access denied.');
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (!configured) {
      setCheckingAuth(false);
      return;
    }

    let mounted = true;
    const adminClient = getAdminSupabase();

    adminClient.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        void evaluateAdminSession(data.session?.user ?? null);
      })
      .catch(() => {
        if (mounted) setCheckingAuth(false);
      });

    const {
      data: { subscription },
    } = adminClient.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      void evaluateAdminSession(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [configured, evaluateAdminSession]);

  // Load initial Postgres snapshot
  const loadSnapshot = useCallback(async () => {
    if (!verifiedAdmin) return;
    setSnapshotLoading(true);
    setSnapshotError(null);

    const res = await fetchAdminSnapshot();
    const dirMap = new Map<string, UserDirectoryRow>();
    for (const row of res.directory) {
      dirMap.set(row.user_id, row);
    }
    prevDirectoryMapRef.current = dirMap;

    const libMap = new Map<string, AdminUserLibraryRow>();
    for (const item of res.library) {
      libMap.set(`${item.user_id}:${item.profile_id}:${item.title_id}`, item);
    }
    prevLibraryMapRef.current = libMap;

    const dlIds = new Set<number>();
    for (const dl of res.apkDownloads) {
      dlIds.add(dl.id);
    }
    apkDownloadIdsRef.current = dlIds;

    setDirectory(res.directory);
    setProfiles(res.profiles);
    setLibrary(res.library);
    setApkDownloads(res.apkDownloads);
    setApkDownloadsTotalCount(res.apkDownloadsTotalCount);
    setApkDownloadsMissing(res.apkDownloadsMissing);
    setSchemaMissing(res.schemaMissing || verifiedAdmin.tableMissing);
    if (res.error && !res.schemaMissing) {
      setSnapshotError(res.error);
    }
    setLastSyncedAt(Date.now());
    setSnapshotLoading(false);
  }, [verifiedAdmin]);

  // Tick timer for live UI counters once authenticated
  useEffect(() => {
    if (!verifiedAdmin) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [verifiedAdmin]);

  // Subscribe to Supabase Realtime (Presence + Postgres Changes) when verified
  useEffect(() => {
    if (!verifiedAdmin) return;

    void loadSnapshot();

    hasInitialPresenceSyncRef.current = false;
    prevPresenceMapRef.current = new Map();
    const pendingLeaveTimers = new Map<string, number>();

    const commitPresenceSnapshot = () => {
      const sorted = Array.from(prevPresenceMapRef.current.values()).sort((a, b) => {
        if (a.status !== b.status) return a.status === 'watching' ? -1 : 1;
        return (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0);
      });
      setLivePresences(sorted);
      setLastSyncedAt(Date.now());
    };

    const getEntityKey = (p: { userId?: string | null; sessionId: string }) =>
      p.userId || p.sessionId;

    const unsubscribe = subscribeAdminRealtime({
      onStatusChange: (status) => {
        setRtStatus(status);
        if (status === 'SUBSCRIBED') {
          setLastSyncedAt(Date.now());
        }
      },
      onPresenceSync: (presences) => {
        const incomingMap = new Map<string, LivePresencePayload>();
        for (const p of presences) {
          incomingMap.set(p.sessionId, p);
        }

        if (!hasInitialPresenceSyncRef.current) {
          hasInitialPresenceSyncRef.current = true;
          prevPresenceMapRef.current = incomingMap;
          commitPresenceSnapshot();
          if (presences.length > 0) {
            const watchingCount = presences.filter((p) => p.status === 'watching').length;
            pushFeedEvent({
              kind: 'online',
              title: 'Realtime snapshot synced',
              detail: `${presences.length} active session${presences.length === 1 ? '' : 's'} (${watchingCount} watching now)`,
            });
          }
          return;
        }

        const committedMap = prevPresenceMapRef.current;

        // 1. Process incoming active sessions & transitions
        for (const p of presences) {
          const pendingTimer = pendingLeaveTimers.get(p.sessionId);
          if (pendingTimer !== undefined) {
            window.clearTimeout(pendingTimer);
            pendingLeaveTimers.delete(p.sessionId);
          }

          const prev = committedMap.get(p.sessionId);
          committedMap.set(p.sessionId, p);
          const ent = getEntityKey(p);

          if (!prev) {
            if (p.status === 'watching' && p.titleName) {
              const epText =
                p.titleType === 'series' && p.season && p.episode
                  ? ` · S${p.season} E${p.episode}`
                  : '';
              const tKey = `${p.titleId || p.titleName}:${p.season || 0}:${p.episode || 0}`;
              pushDedupFeedEvent(`watch:${ent}:${tKey}`, {
                kind: 'watch',
                title: `${p.displayName} started watching`,
                detail: `${p.titleName}${epText} (${p.platform})`,
              });
            } else {
              const alreadyOnlineElsewhere = Boolean(
                p.userId &&
                Array.from(committedMap.values()).some(
                  (other) => other.userId === p.userId && other.sessionId !== p.sessionId
                )
              );
              if (!alreadyOnlineElsewhere) {
                pushDedupFeedEvent(`online:${ent}`, {
                  kind: 'online',
                  title: `${p.displayName} came online`,
                  detail: `${p.platform} · ${formatRouteLabel(p.route)}`,
                });
              }
            }
          } else if (prev.status !== 'watching' && p.status === 'watching' && p.titleName) {
            const epText =
              p.titleType === 'series' && p.season && p.episode
                ? ` · S${p.season} E${p.episode}`
                : '';
            const tKey = `${p.titleId || p.titleName}:${p.season || 0}:${p.episode || 0}`;
            pushDedupFeedEvent(`watch:${ent}:${tKey}`, {
              kind: 'watch',
              title: `${p.displayName} started watching`,
              detail: `${p.titleName}${epText} (${p.platform})`,
            });
          } else if (prev.status === 'watching' && p.status === 'watching' && p.titleName) {
            const prevEpKey = `${prev.titleId}|${prev.season || 0}|${prev.episode || 0}`;
            const nextEpKey = `${p.titleId}|${p.season || 0}|${p.episode || 0}`;
            if (prevEpKey !== nextEpKey) {
              const epText =
                p.titleType === 'series' && p.season && p.episode
                  ? ` · S${p.season} E${p.episode}`
                  : '';
              const tKey = `${p.titleId || p.titleName}:${p.season || 0}:${p.episode || 0}`;
              pushDedupFeedEvent(`watch:${ent}:${tKey}`, {
                kind: 'watch',
                title:
                  prev.titleId === p.titleId
                    ? `${p.displayName} switched episode`
                    : `${p.displayName} switched title`,
                detail: `${p.titleName}${epText}`,
              });
            }
          } else if (prev.status === 'watching' && p.status !== 'watching') {
            pushDedupFeedEvent(`stopwatch:${ent}`, {
              kind: 'online',
              title: `${p.displayName} stopped watching`,
              detail: `Still online · ${formatRouteLabel(p.route)}`,
            });
          }
        }

        // 2. Grace-buffer missing sessions briefly (1.8s) so Presence track() diffs never flicker offline
        for (const [sessionId, prev] of committedMap.entries()) {
          if (!incomingMap.has(sessionId) && !pendingLeaveTimers.has(sessionId)) {
            const timer = window.setTimeout(() => {
              pendingLeaveTimers.delete(sessionId);
              const latestPrev = prevPresenceMapRef.current.get(sessionId);
              if (!latestPrev) return;
              prevPresenceMapRef.current.delete(sessionId);
              commitPresenceSnapshot();

              // Check if another tab for the same userId is still actively present
              const anotherSessionAlive = Boolean(
                latestPrev.userId &&
                Array.from(prevPresenceMapRef.current.values()).some(
                  (other) => other.userId === latestPrev.userId
                )
              );
              if (!anotherSessionAlive) {
                const ent = getEntityKey(latestPrev);
                const appClosed = isAndroidAppPlatform(latestPrev.platform);
                pushDedupFeedEvent(`offline:${ent}`, {
                  kind: 'leave',
                  title: `${latestPrev.displayName} went offline`,
                  detail:
                    latestPrev.status === 'watching' && latestPrev.titleName
                      ? `Closed ${appClosed ? 'Android app' : 'browser'} (was watching ${latestPrev.titleName})`
                      : `${latestPrev.platform} · ${appClosed ? 'App closed' : 'Browser closed'}`,
                });
              }
            }, 1800);
            pendingLeaveTimers.set(sessionId, timer);
          }
        }

        commitPresenceSnapshot();
      },
      onDirectoryEvent: (eventType, newRow, oldRow) => {
        setLastSyncedAt(Date.now());
        if (eventType === 'DELETE' && oldRow?.user_id) {
          prevDirectoryMapRef.current.delete(oldRow.user_id);
          setDirectory((prev) => prev.filter((r) => r.user_id !== oldRow.user_id));
          return;
        }
        if (!newRow) return;

        const prevRow = prevDirectoryMapRef.current.get(newRow.user_id);
        prevDirectoryMapRef.current.set(newRow.user_id, newRow);

        const displayName =
          newRow.full_name || newRow.active_profile_name || newRow.email.split('@')[0] || 'Vybe User';

        if (!prevRow) {
          if (eventType === 'INSERT') {
            pushDedupFeedEvent(`signup:${newRow.user_id}`, {
              kind: 'db',
              title: 'New registered user',
              detail: newRow.email || displayName,
            });
          } else if (newRow.is_online && newRow.is_watching && newRow.current_title_name) {
            const epText =
              newRow.current_title_type === 'series' && newRow.current_season && newRow.current_episode
                ? ` · S${newRow.current_season} E${newRow.current_episode}`
                : '';
            const tKey = `${newRow.current_title_id || newRow.current_title_name}:${newRow.current_season || 0}:${newRow.current_episode || 0}`;
            pushDedupFeedEvent(`watch:${newRow.user_id}:${tKey}`, {
              kind: 'watch',
              title: `${displayName} started watching`,
              detail: `${newRow.current_title_name}${epText} (${newRow.platform})`,
            });
          } else if (newRow.is_online) {
            pushDedupFeedEvent(`online:${newRow.user_id}`, {
              kind: 'online',
              title: `${displayName} came online`,
              detail: `${newRow.platform} · ${formatRouteLabel(newRow.current_route)}`,
            });
          }
        } else {
          // If the user explicitly closed the browser or signed out while no Presence tab remains,
          // emit the offline event cleanly.
          if (prevRow.is_online && !newRow.is_online) {
            const hasPresenceSession = Array.from(prevPresenceMapRef.current.values()).some(
              (p) => p.userId === newRow.user_id
            );
            if (!hasPresenceSession) {
              pushDedupFeedEvent(`offline:${newRow.user_id}`, {
                kind: 'leave',
                title: `${displayName} went offline`,
                detail: `${newRow.platform} · ${isAndroidAppPlatform(newRow.platform) ? 'Closed Android app' : 'Closed browser'}`,
              });
            }
          } else if (!prevRow.is_online && newRow.is_online && !newRow.is_watching) {
            pushDedupFeedEvent(`online:${newRow.user_id}`, {
              kind: 'online',
              title: `${displayName} came online`,
              detail: `${newRow.platform} · ${formatRouteLabel(newRow.current_route)}`,
            });
          } else if (newRow.is_online && newRow.is_watching && newRow.current_title_name) {
            const prevTitleKey = `${prevRow.current_title_id || ''}:${prevRow.current_season || 0}:${prevRow.current_episode || 0}`;
            const nextTitleKey = `${newRow.current_title_id || ''}:${newRow.current_season || 0}:${newRow.current_episode || 0}`;
            if (!prevRow.is_watching || prevTitleKey !== nextTitleKey) {
              const epText =
                newRow.current_title_type === 'series' && newRow.current_season && newRow.current_episode
                  ? ` · S${newRow.current_season} E${newRow.current_episode}`
                  : '';
              const tKey = `${newRow.current_title_id || newRow.current_title_name}:${newRow.current_season || 0}:${newRow.current_episode || 0}`;
              pushDedupFeedEvent(`watch:${newRow.user_id}:${tKey}`, {
                kind: 'watch',
                title: !prevRow.is_watching
                  ? `${displayName} started watching`
                  : prevRow.current_title_id === newRow.current_title_id
                    ? `${displayName} switched episode`
                    : `${displayName} switched title`,
                detail: `${newRow.current_title_name}${epText} (${newRow.platform})`,
              });
            }
          } else if (prevRow.is_watching && !newRow.is_watching && newRow.is_online) {
            pushDedupFeedEvent(`stopwatch:${newRow.user_id}`, {
              kind: 'online',
              title: `${displayName} stopped watching`,
              detail: `Still online · ${formatRouteLabel(newRow.current_route)}`,
            });
          }
        }

        setDirectory((prev) => {
          const idx = prev.findIndex((r) => r.user_id === newRow.user_id);
          if (idx === -1) {
            return [newRow, ...prev];
          }
          const updated = [...prev];
          updated[idx] = newRow;
          return updated.sort(
            (a, b) => (Date.parse(b.last_seen_at) || 0) - (Date.parse(a.last_seen_at) || 0)
          );
        });
      },
      onProfileEvent: (eventType, newRow, oldRow) => {
        if (eventType === 'DELETE' && oldRow?.user_id && oldRow?.id) {
          setProfiles((prev) =>
            prev.filter((p) => !(p.user_id === oldRow.user_id && p.id === oldRow.id))
          );
          return;
        }
        if (!newRow) return;
        setProfiles((prev) => {
          const idx = prev.findIndex((p) => p.user_id === newRow.user_id && p.id === newRow.id);
          if (idx === -1) return [...prev, newRow];
          const updated = [...prev];
          updated[idx] = newRow;
          return updated;
        });
      },
      onLibraryEvent: (eventType, newRow, oldRow) => {
        if (eventType === 'DELETE' && oldRow?.user_id && oldRow?.profile_id && oldRow?.title_id) {
          prevLibraryMapRef.current.delete(
            `${oldRow.user_id}:${oldRow.profile_id}:${oldRow.title_id}`
          );
          setLibrary((prev) =>
            prev.filter(
              (l) =>
                !(
                  l.user_id === oldRow.user_id &&
                  l.profile_id === oldRow.profile_id &&
                  l.title_id === oldRow.title_id
                )
            )
          );
          return;
        }
        if (!newRow) return;

        const libKey = `${newRow.user_id}:${newRow.profile_id}:${newRow.title_id}`;
        const prevLib = prevLibraryMapRef.current.get(libKey);
        prevLibraryMapRef.current.set(libKey, newRow);

        const dirUser = prevDirectoryMapRef.current.get(newRow.user_id);
        const actorName =
          dirUser?.full_name ||
          dirUser?.active_profile_name ||
          dirUser?.email?.split('@')[0] ||
          'Vybe Member';
        const titleLabel =
          getTitleRef.current(newRow.title_id)?.name || formatFallbackTitleLabel(newRow.title_id);

        if (!prevLib?.in_watchlist && newRow.in_watchlist) {
          pushDedupFeedEvent(`watchlist:${libKey}`, {
            kind: 'db',
            title: `${actorName} added to My List`,
            detail: titleLabel,
          });
        } else if (!prevLib?.is_liked && newRow.is_liked) {
          pushDedupFeedEvent(`liked:${libKey}`, {
            kind: 'db',
            title: `${actorName} liked a title`,
            detail: titleLabel,
          });
        }

        setLibrary((prev) => {
          const idx = prev.findIndex(
            (l) =>
              l.user_id === newRow.user_id &&
              l.profile_id === newRow.profile_id &&
              l.title_id === newRow.title_id
          );
          if (idx === -1) return [newRow, ...prev];
          const updated = [...prev];
          updated[idx] = newRow;
          return updated.sort(
            (a, b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0)
          );
        });
      },
      onApkDownloadEvent: (eventType, newRow, oldRow) => {
        setLastSyncedAt(Date.now());
        setApkDownloadsMissing(false);
        if (eventType === 'DELETE' && oldRow?.id !== undefined) {
          const had = apkDownloadIdsRef.current.delete(oldRow.id);
          if (had) {
            setApkDownloadsTotalCount((c) => Math.max(0, c - 1));
          }
          setApkDownloads((prev) => prev.filter((d) => d.id !== oldRow.id));
          return;
        }
        if (!newRow) return;

        const isNew = !apkDownloadIdsRef.current.has(newRow.id);
        apkDownloadIdsRef.current.add(newRow.id);

        setApkDownloads((prev) => {
          const idx = prev.findIndex((d) => d.id === newRow.id);
          if (idx === -1) {
            return [newRow, ...prev].slice(0, 250);
          }
          const updated = [...prev];
          updated[idx] = newRow;
          return updated;
        });

        if (eventType === 'INSERT' && isNew) {
          setApkDownloadsTotalCount((c) => c + 1);
          const dirUser = newRow.user_id ? prevDirectoryMapRef.current.get(newRow.user_id) : undefined;
          const actorName =
            dirUser?.full_name ||
            dirUser?.active_profile_name ||
            dirUser?.email?.split('@')[0] ||
            'Visitor';
          pushDedupFeedEvent(
            `apk-dl:${newRow.id}`,
            {
              kind: 'download',
              title: `${actorName} downloaded Android APK`,
              detail: `From ${formatApkSourceLabel(newRow.source)} · ${newRow.platform} · v${newRow.app_version || '1.0'}`,
            },
            4000
          );
        }
      },
    });

    return () => {
      for (const timer of pendingLeaveTimers.values()) {
        window.clearTimeout(timer);
      }
      pendingLeaveTimers.clear();
      unsubscribe();
    };
  }, [verifiedAdmin, loadSnapshot, pushFeedEvent, pushDedupFeedEvent]);

  // Lazy-fetch TMDB details for expanded user's library items if not in initial catalog
  useEffect(() => {
    if (!expandedUserId) return;
    const userLib = library.filter((l) => l.user_id === expandedUserId).slice(0, 20);
    const missingIds = userLib
      .map((l) => l.title_id)
      .filter(
        (tid) =>
          tid &&
          !getTitle(tid) &&
          !resolvedTitles[tid] &&
          !fetchingTitleIdsRef.current.has(tid)
      );

    if (missingIds.length === 0) return;
    missingIds.forEach((tid) => fetchingTitleIdsRef.current.add(tid));

    let active = true;
    Promise.all(missingIds.map((tid) => fetchTitleById(tid).catch(() => null))).then((results) => {
      if (!active) return;
      const patch: Record<string, Title> = {};
      for (const item of results) {
        if (item?.id) patch[item.id] = item;
      }
      if (Object.keys(patch).length > 0) {
        setResolvedTitles((prev) => ({ ...prev, ...patch }));
      }
    });

    return () => {
      active = false;
    };
  }, [expandedUserId, library, getTitle, resolvedTitles]);

  const directoryById = useMemo(() => {
    const map = new Map<string, UserDirectoryRow>();
    for (const row of directory) {
      map.set(row.user_id, row);
    }
    return map;
  }, [directory]);

  const profilesByUser = useMemo(() => {
    const map = new Map<string, AdminUserProfileRow[]>();
    for (const prof of profiles) {
      const arr = map.get(prof.user_id) || [];
      arr.push(prof);
      map.set(prof.user_id, arr);
    }
    return map;
  }, [profiles]);

  const libraryByUser = useMemo(() => {
    const map = new Map<string, AdminUserLibraryRow[]>();
    for (const item of library) {
      const arr = map.get(item.user_id) || [];
      arr.push(item);
      map.set(item.user_id, arr);
    }
    return map;
  }, [library]);

  // Unified active sessions: Presence primary + fresh Postgres user_directory fallback.
  // Guarantees a user who starts watching stays in Active Users Online until closing browser/signing out.
  const mergedOnlineSessions = useMemo<LivePresencePayload[]>(() => {
    const sessions = [...livePresences];
    const representedUserIds = new Set(
      sessions.map((s) => s.userId).filter((id): id is string => Boolean(id))
    );

    for (const row of directory) {
      if (representedUserIds.has(row.user_id)) continue;
      if (!row.is_online) continue;
      const seenMs = Date.parse(row.last_seen_at) || 0;
      if (nowMs - seenMs > ONLINE_STALE_MS) continue;

      representedUserIds.add(row.user_id);
      const isWatching = Boolean(row.is_watching && row.current_title_id);
      sessions.push({
        sessionId: `db-${row.user_id}`,
        userId: row.user_id,
        displayName:
          row.full_name || row.active_profile_name || row.email.split('@')[0] || 'Vybe User',
        profileName: row.active_profile_name || 'Alex',
        profileAvatar: row.active_profile_avatar ?? 0,
        isAuthenticated: true,
        status: isWatching ? 'watching' : 'browsing',
        route:
          row.current_route ||
          (isWatching && row.current_title_id ? `/watch/${row.current_title_id}` : '/'),
        platform: row.platform || 'Web',
        titleId: isWatching ? row.current_title_id : null,
        titleName: isWatching
          ? row.current_title_name ||
          (row.current_title_id ? formatFallbackTitleLabel(row.current_title_id) : null)
          : null,
        titleType: isWatching ? row.current_title_type || 'movie' : null,
        poster: isWatching ? row.current_poster || null : null,
        season: isWatching ? row.current_season : null,
        episode: isWatching ? row.current_episode : null,
        episodeName: isWatching ? row.current_episode_name : null,
        positionSec: isWatching ? row.current_position || 0 : 0,
        durationSec: isWatching ? row.current_duration || 5400 : 0,
        connectedAt: row.last_seen_at,
        watchingStartedAt: isWatching ? row.updated_at || row.last_seen_at : null,
        updatedAt: row.updated_at || row.last_seen_at,
      });
    }

    return sessions.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'watching' ? -1 : 1;
      return (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0);
    });
  }, [livePresences, directory, nowMs]);

  // Map active online sessions by userId for Registered Users Directory correlation
  const onlineByUserId = useMemo(() => {
    const map = new Map<string, LivePresencePayload>();
    for (const p of mergedOnlineSessions) {
      if (p.userId) {
        const existing = map.get(p.userId);
        if (!existing || (p.status === 'watching' && existing.status !== 'watching')) {
          map.set(p.userId, p);
        }
      }
    }
    return map;
  }, [mergedOnlineSessions]);

  // Watching in Real Time is strictly derived from mergedOnlineSessions so watching users stay Online
  const currentlyWatching = useMemo(
    () => mergedOnlineSessions.filter((s) => s.status === 'watching' && Boolean(s.titleId)),
    [mergedOnlineSessions]
  );

  const filteredWatching = useMemo(() => {
    const q = watchSearch.trim().toLowerCase();
    return currentlyWatching.filter((stream) => {
      if (watchFilter === 'series' && stream.titleType !== 'series') return false;
      if (watchFilter === 'movies' && stream.titleType !== 'movie') return false;
      if (watchFilter === 'android' && !isAndroidAppPlatform(stream.platform)) return false;
      if (!q) return true;
      const dir = stream.userId ? directoryById.get(stream.userId) : undefined;
      return (
        (stream.titleName || '').toLowerCase().includes(q) ||
        stream.displayName.toLowerCase().includes(q) ||
        stream.profileName.toLowerCase().includes(q) ||
        stream.platform.toLowerCase().includes(q) ||
        (dir?.email || '').toLowerCase().includes(q)
      );
    });
  }, [currentlyWatching, watchFilter, watchSearch, directoryById]);

  const filteredActivePresences = useMemo(() => {
    return mergedOnlineSessions.filter((p) => {
      if (activeTab === 'watching') return p.status === 'watching';
      if (activeTab === 'browsing') return p.status === 'browsing';
      if (activeTab === 'android') return isAndroidAppPlatform(p.platform);
      if (activeTab === 'signedin') return p.isAuthenticated;
      if (activeTab === 'guests') return !p.isAuthenticated;
      return true;
    });
  }, [mergedOnlineSessions, activeTab]);

  // Enriched registered users directory with live Realtime status merged in
  const enrichedDirectory = useMemo(() => {
    return directory.map((row) => {
      const live = onlineByUserId.get(row.user_id);
      const seenMs = Date.parse(row.last_seen_at) || 0;
      const isFreshDbOnline = row.is_online && nowMs - seenMs <= ONLINE_STALE_MS;
      const effectiveOnline = Boolean(live) || isFreshDbOnline;
      const effectiveWatching =
        live?.status === 'watching' ||
        (effectiveOnline && row.is_watching && Boolean(row.current_title_id));
      const userProfs = profilesByUser.get(row.user_id) || [];
      const userLib = libraryByUser.get(row.user_id) || [];

      return {
        row,
        live,
        effectiveOnline,
        effectiveWatching,
        profiles: userProfs,
        library: userLib,
        watchlistCount: userLib.filter((l) => l.in_watchlist).length,
        watchedCount: userLib.filter((l) => l.position > 0).length,
      };
    });
  }, [directory, onlineByUserId, profilesByUser, libraryByUser, nowMs]);

  const filteredDirectory = useMemo(() => {
    const q = directorySearch.trim().toLowerCase();
    return enrichedDirectory.filter((item) => {
      if (directoryFilter === 'online' && !item.effectiveOnline) return false;
      if (directoryFilter === 'watching' && !item.effectiveWatching) return false;
      if (directoryFilter === 'android' && !isAndroidAppPlatform(item.live?.platform || item.row.platform)) {
        return false;
      }
      if (directoryFilter === 'offline' && item.effectiveOnline) return false;
      if (!q) return true;
      return (
        item.row.email.toLowerCase().includes(q) ||
        item.row.full_name.toLowerCase().includes(q) ||
        (item.row.active_profile_name || '').toLowerCase().includes(q) ||
        (item.live?.platform || item.row.platform || '').toLowerCase().includes(q) ||
        (item.live?.titleName || item.row.current_title_name || '').toLowerCase().includes(q)
      );
    });
  }, [enrichedDirectory, directoryFilter, directorySearch]);

  // KPI aggregations derived from unified mergedOnlineSessions
  const uniqueActiveUserCount = useMemo(() => {
    const keys = new Set<string>();
    for (const p of mergedOnlineSessions) {
      keys.add(p.userId ? `u:${p.userId}` : `s:${p.sessionId}`);
    }
    return keys.size;
  }, [mergedOnlineSessions]);

  const signedInOnlineCount = useMemo(() => {
    const ids = new Set<string>();
    for (const p of mergedOnlineSessions) {
      if (p.isAuthenticated) {
        ids.add(p.userId || p.sessionId);
      }
    }
    return ids.size;
  }, [mergedOnlineSessions]);

  const signedInSessionCount = useMemo(
    () => mergedOnlineSessions.filter((p) => p.isAuthenticated).length,
    [mergedOnlineSessions]
  );

  const guestOnlineCount = useMemo(
    () => mergedOnlineSessions.filter((p) => !p.isAuthenticated).length,
    [mergedOnlineSessions]
  );

  const androidAppOnlineCount = useMemo(
    () => mergedOnlineSessions.filter((p) => isAndroidAppPlatform(p.platform)).length,
    [mergedOnlineSessions]
  );

  const activeWatchingCount = useMemo(
    () => mergedOnlineSessions.filter((p) => p.status === 'watching').length,
    [mergedOnlineSessions]
  );

  const activeBrowsingCount = mergedOnlineSessions.length - activeWatchingCount;

  const watchingSeriesCount = useMemo(
    () => currentlyWatching.filter((w) => w.titleType === 'series').length,
    [currentlyWatching]
  );
  const watchingMoviesCount = currentlyWatching.length - watchingSeriesCount;
  const androidAppWatchingCount = useMemo(
    () => currentlyWatching.filter((w) => isAndroidAppPlatform(w.platform)).length,
    [currentlyWatching]
  );

  const registeredAndroidAppUsersCount = useMemo(
    () => directory.filter((u) => isAndroidAppPlatform(u.platform)).length,
    [directory]
  );

  const newUsersTodayCount = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const cutoff = startOfToday.getTime();
    return directory.filter((u) => (Date.parse(u.created_at) || 0) >= cutoff).length;
  }, [directory]);

  const apkDownloadsTodayCount = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const cutoff = startOfToday.getTime();
    return apkDownloads.filter((d) => (Date.parse(d.created_at) || 0) >= cutoff).length;
  }, [apkDownloads]);

  const apkCountBySource = useMemo(() => {
    const counts = { popup: 0, footer: 0, profile_menu: 0, direct: 0 };
    for (const d of apkDownloads) {
      if (d.source === 'popup') counts.popup += 1;
      else if (d.source === 'footer') counts.footer += 1;
      else if (d.source === 'profile_menu') counts.profile_menu += 1;
      else counts.direct += 1;
    }
    return counts;
  }, [apkDownloads]);

  const apkPopupSharePct = useMemo(() => {
    if (apkDownloads.length === 0) return 0;
    return Math.round((apkCountBySource.popup / apkDownloads.length) * 100);
  }, [apkDownloads.length, apkCountBySource.popup]);

  const filteredApkDownloads = useMemo(() => {
    if (apkSourceFilter === 'all') return apkDownloads;
    return apkDownloads.filter((d) => d.source === apkSourceFilter);
  }, [apkDownloads, apkSourceFilter]);

  const resolveTitleMeta = useCallback(
    (titleId: string): { name: string; poster: string } => {
      const cat = getTitle(titleId) || resolvedTitles[titleId];
      if (cat) {
        return { name: cat.name, poster: cat.poster || cat.backdrop || '' };
      }
      return { name: formatFallbackTitleLabel(titleId), poster: '' };
    },
    [getTitle, resolvedTitles]
  );

  const handleSignOut = async () => {
    await signOutAdminSupabase();
    prevPresenceMapRef.current.clear();
    prevDirectoryMapRef.current.clear();
    prevLibraryMapRef.current.clear();
    apkDownloadIdsRef.current.clear();
    recentFeedDedupRef.current.clear();
    hasInitialPresenceSyncRef.current = false;
    setVerifiedAdmin(null);
    setLivePresences([]);
    setDirectory([]);
    setProfiles([]);
    setLibrary([]);
    setApkDownloads([]);
    setApkDownloadsTotalCount(0);
    setApkDownloadsMissing(false);
    setFeedEvents([]);
  };

  if (!configured) {
    return (
      <div className="admin-login-shell">
        <div className="admin-login-card">
          <div className="admin-login-brand-row">
            <Logo size="sm" />
            <span className="admin-badge">Admin Console</span>
          </div>
          <h1 className="admin-login-title">Supabase Not Configured</h1>
          <p className="admin-login-subtitle">
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your environment before opening the Admin Dashboard.
          </p>
          <div className="admin-login-footer">
            <Link to="/" className="admin-back-link">
              Return to Vybe
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (checkingAuth) {
    return (
      <div className="admin-login-shell">
        <div className="admin-loading-box">
          <span className="spinner" />
          <p>Verifying administrator session…</p>
        </div>
      </div>
    );
  }

  if (!verifiedAdmin) {
    return (
      <AdminLoginView
        externalError={authError}
        onBeforeSubmit={() => {
          setAuthError(null);
        }}
      />
    );
  }

  return (
    <div className="admin-page">
      {/* Top Operations Header */}
      <header className="admin-header">
        <div className="admin-header__left">
          <Link to="/" className="admin-header__logo" aria-label="Vybe Home">
            <Logo size="sm" />
          </Link>
          <span className="admin-header__sep">/</span>
          <div className="admin-header__title-group">
            <h1 className="admin-header__title">Live Operations Dashboard</h1>
            <span className="admin-header__subtitle">
              Real-time viewer &amp; playback telemetry
            </span>
          </div>
        </div>

        <div className="admin-header__right">
          <div
            className={`admin-rt-pill admin-rt-pill--${rtStatus === 'SUBSCRIBED'
                ? 'live'
                : rtStatus === 'CONNECTING'
                  ? 'connecting'
                  : 'error'
              }`}
            title="Supabase Realtime WebSocket Status"
          >
            {rtStatus === 'SUBSCRIBED' ? (
              <Wifi size={14} aria-hidden="true" />
            ) : (
              <WifiOff size={14} aria-hidden="true" />
            )}
            <span className="admin-rt-dot" />
            <span>
              {rtStatus === 'SUBSCRIBED'
                ? 'Supabase Realtime Live'
                : rtStatus === 'CONNECTING'
                  ? 'Connecting Realtime…'
                  : 'Realtime Reconnecting'}
            </span>
          </div>

          <div className="admin-account-pill" title={`Signed in as ${verifiedAdmin.adminEmail}`}>
            <ShieldCheck size={14} aria-hidden="true" />
            <span>{verifiedAdmin.adminEmail}</span>
          </div>

          <button
            type="button"
            className="admin-icon-btn"
            onClick={() => void loadSnapshot()}
            disabled={snapshotLoading}
            title="Refresh database snapshot"
          >
            <RefreshCw size={15} className={snapshotLoading ? 'spin-icon' : ''} />
            <span>Sync</span>
          </button>

          <Link to="/" className="admin-icon-btn admin-icon-btn--ghost">
            <Eye size={15} />
            <span>View Site</span>
          </Link>

          <button
            type="button"
            className="admin-icon-btn admin-icon-btn--danger"
            onClick={() => void handleSignOut()}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        {/* Conditional Setup / Diagnostics Banners */}
        {schemaMissing && (
          <div className="admin-banner admin-banner--warn" role="status">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Postgres Admin Schema Pending:</strong> Supabase Realtime Presence is already live,
              but <code>public.admin_users</code> / <code>public.user_directory</code> tables were not detected yet.
              Run <code>supabase/admin_dashboard.sql</code> in your Supabase SQL Editor to enable full registered user directory, emails, and database Realtime sync.
            </div>
          </div>
        )}

        {snapshotError && (
          <div className="admin-banner admin-banner--error" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Sync Warning:</strong> {snapshotError}
            </div>
          </div>
        )}

        {/* 1. KPI Summary Strip */}
        <section className="admin-kpis" aria-label="Realtime Summary Metrics">
          <div className="admin-kpi-card">
            <div className="admin-kpi-card__top">
              <span className="admin-kpi-card__label">Active Users Online</span>
              <span className="admin-kpi-icon admin-kpi-icon--green">
                <Activity size={17} />
              </span>
            </div>
            <div className="admin-kpi-card__value">{uniqueActiveUserCount}</div>
            <div className="admin-kpi-card__meta">
              {mergedOnlineSessions.length} live sessions · {signedInOnlineCount} signed-in · {guestOnlineCount} guests
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-card__top">
              <span className="admin-kpi-card__label">Watching in Real Time</span>
              <span className="admin-kpi-icon admin-kpi-icon--red">
                <Play size={17} />
              </span>
            </div>
            <div className="admin-kpi-card__value">{currentlyWatching.length}</div>
            <div className="admin-kpi-card__meta">
              {watchingSeriesCount} watching series · {watchingMoviesCount} watching movies
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-card__top">
              <span className="admin-kpi-card__label">Registered Users</span>
              <span className="admin-kpi-icon admin-kpi-icon--blue">
                <Users size={17} />
              </span>
            </div>
            <div className="admin-kpi-card__value">{directory.length}</div>
            <div className="admin-kpi-card__meta">
              {enrichedDirectory.filter((u) => u.effectiveOnline).length} online now · +{newUsersTodayCount} joined today
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-card__top">
              <span className="admin-kpi-card__label">Profiles &amp; Watch Sync</span>
              <span className="admin-kpi-icon admin-kpi-icon--purple">
                <ListChecks size={17} />
              </span>
            </div>
            <div className="admin-kpi-card__value">{profiles.length}</div>
            <div className="admin-kpi-card__meta">
              {library.length} saved items · synced {lastSyncedAt ? formatRelativeAge(lastSyncedAt, nowMs) : '—'}
            </div>
          </div>

          <button
            type="button"
            className="admin-kpi-card admin-kpi-card--interactive"
            onClick={() =>
              apkSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          >
            <div className="admin-kpi-card__top">
              <span className="admin-kpi-card__label">Android APK Downloads</span>
              <span className="admin-kpi-icon admin-kpi-icon--emerald">
                <Download size={17} />
              </span>
            </div>
            <div className="admin-kpi-card__value">
              {apkDownloadsMissing ? '—' : apkDownloadsTotalCount}
            </div>
            <div className="admin-kpi-card__meta">
              {apkDownloadsMissing
                ? 'Run admin_dashboard.sql to track'
                : `+${apkDownloadsTodayCount} today · ${androidAppOnlineCount} app live`}
            </div>
          </button>
        </section>

        {/* 2. Primary Live Panel: Users Currently Watching in Real Time */}
        <section className="admin-panel" aria-labelledby="watching-heading">
          <div className="admin-panel__header">
            <div className="admin-panel__title-wrap">
              <span className="admin-live-tag">
                <Radio size={13} />
                <span>LIVE STREAMING</span>
              </span>
              <h2 id="watching-heading" className="admin-panel__title">
                Users Currently Watching in Real Time ({currentlyWatching.length})
              </h2>
            </div>

            <div className="admin-panel__controls">
              <div className="admin-search-box">
                <Search size={14} />
                <input
                  type="search"
                  placeholder="Search title or user..."
                  value={watchSearch}
                  onChange={(e) => setWatchSearch(e.target.value)}
                  aria-label="Filter currently watching streams"
                />
              </div>

              <div className="admin-filter-pills" role="group" aria-label="Filter stream type">
                <button
                  type="button"
                  className={`admin-pill-btn ${watchFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setWatchFilter('all')}
                >
                  All ({currentlyWatching.length})
                </button>
                <button
                  type="button"
                  className={`admin-pill-btn ${watchFilter === 'series' ? 'active' : ''}`}
                  onClick={() => setWatchFilter('series')}
                >
                  Series ({watchingSeriesCount})
                </button>
                <button
                  type="button"
                  className={`admin-pill-btn ${watchFilter === 'movies' ? 'active' : ''}`}
                  onClick={() => setWatchFilter('movies')}
                >
                  Movies ({watchingMoviesCount})
                </button>
                <button
                  type="button"
                  className={`admin-pill-btn ${watchFilter === 'android' ? 'active' : ''}`}
                  onClick={() => setWatchFilter('android')}
                >
                  Android APK ({androidAppWatchingCount})
                </button>
              </div>
            </div>
          </div>

          {filteredWatching.length === 0 ? (
            <div className="admin-empty">
              <Play size={26} />
              <h3>No active streams right now</h3>
              <p>
                Whenever a user opens the video player (<code>/watch</code>), their title, episode, live progress, and device appear here instantaneously.
              </p>
            </div>
          ) : (
            <div className="admin-watch-grid">
              {filteredWatching.map((stream) => {
                const dir = stream.userId ? directoryById.get(stream.userId) : undefined;
                const emailLabel = dir?.email || null;
                const updatedMs = Date.parse(stream.updatedAt || '') || nowMs;
                const driftSec = Math.max(0, Math.floor((nowMs - updatedMs) / 1000));
                const duration = Math.max(60, stream.durationSec || 5400);
                const estimatedPos = Math.min(duration, (stream.positionSec || 0) + Math.min(driftSec, 55));
                const pct = Math.min(100, Math.max(1, Math.round((estimatedPos / duration) * 100)));
                const watchElapsedSec = Math.max(
                  0,
                  Math.floor((nowMs - (Date.parse(stream.watchingStartedAt || stream.connectedAt) || nowMs)) / 1000)
                );

                return (
                  <article key={stream.sessionId} className="admin-watch-card">
                    <div className="admin-watch-card__poster">
                      <SmartImage
                        src={stream.poster || ''}
                        alt={stream.titleName || 'Stream poster'}
                        fallbackLabel={stream.titleName || 'Vybe'}
                      />
                      <span className="admin-watch-card__live-chip">LIVE</span>
                    </div>

                    <div className="admin-watch-card__body">
                      <div className="admin-watch-card__badges">
                        <span className="admin-type-chip">
                          {stream.titleType === 'series' ? <Tv size={11} /> : <Film size={11} />}
                          <span>{stream.titleType === 'series' ? 'Series' : 'Movie'}</span>
                        </span>
                        <span
                          className={`admin-platform-chip ${isAndroidAppPlatform(stream.platform) ? 'admin-platform-chip--apk' : ''
                            }`}
                        >
                          <PlatformIcon platform={stream.platform} />
                          <span>{stream.platform}</span>
                        </span>
                      </div>

                      <h3 className="admin-watch-card__title" title={stream.titleName || undefined}>
                        {stream.titleName || formatFallbackTitleLabel(stream.titleId || '')}
                      </h3>

                      {stream.titleType === 'series' && stream.season && stream.episode && (
                        <p className="admin-watch-card__episode">
                          Season {stream.season} · Episode {stream.episode}
                          {stream.episodeName && stream.episodeName !== `Episode ${stream.episode}`
                            ? ` — ${stream.episodeName}`
                            : ''}
                        </p>
                      )}

                      <div className="admin-watch-card__user">
                        <ProfileAvatar avatar={stream.profileAvatar ?? 0} size={28} />
                        <div className="admin-watch-card__user-meta">
                          <span className="admin-watch-card__user-name">
                            {stream.displayName}
                            <span className="admin-profile-tag">{stream.profileName}</span>
                          </span>
                          <span className="admin-watch-card__user-email">
                            {emailLabel || (stream.isAuthenticated ? 'Signed-in viewer' : 'Guest session')}
                          </span>
                        </div>
                      </div>

                      <div className="admin-watch-progress">
                        <div className="admin-watch-progress__track">
                          <div
                            className="admin-watch-progress__fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="admin-watch-progress__stats">
                          <span>
                            {formatClockDuration(estimatedPos)} / {formatClockDuration(duration)} ({pct}%)
                          </span>
                          <span className="admin-watch-elapsed">
                            <Clock size={11} aria-hidden="true" />
                            <span>{formatClockDuration(watchElapsedSec)} session</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Active Users Online + Live Realtime Event Feed */}
        <div className="admin-split-grid">
          <section className="admin-panel" aria-labelledby="active-users-heading">
            <div className="admin-panel__header">
              <div className="admin-panel__title-wrap">
                <h2 id="active-users-heading" className="admin-panel__title">
                  Active Users Online Now ({mergedOnlineSessions.length})
                </h2>
              </div>

              <div className="admin-filter-pills" role="group" aria-label="Filter active users">
                {(
                  [
                    ['all', `All (${mergedOnlineSessions.length})`],
                    ['watching', `Watching (${activeWatchingCount})`],
                    ['browsing', `Browsing (${activeBrowsingCount})`],
                    ['android', `Android APK (${androidAppOnlineCount})`],
                    ['signedin', `Accounts (${signedInSessionCount})`],
                    ['guests', `Guests (${guestOnlineCount})`],
                  ] as [ActiveTab, string][]
                ).map(([tabKey, label]) => (
                  <button
                    key={tabKey}
                    type="button"
                    className={`admin-pill-btn ${activeTab === tabKey ? 'active' : ''}`}
                    onClick={() => setActiveTab(tabKey)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredActivePresences.length === 0 ? (
              <div className="admin-empty admin-empty--compact">
                <Users size={22} />
                <h3>No matching active sessions</h3>
                <p>Active sessions browsing or streaming Vybe appear instantaneously here.</p>
              </div>
            ) : (
              <div className="admin-active-list">
                {filteredActivePresences.map((p) => {
                  const dir = p.userId ? directoryById.get(p.userId) : undefined;
                  const onlineSec = Math.max(
                    0,
                    Math.floor((nowMs - (Date.parse(p.connectedAt) || nowMs)) / 1000)
                  );
                  const isApkSession = isAndroidAppPlatform(p.platform);
                  return (
                    <div key={p.sessionId} className="admin-active-row">
                      <div className="admin-active-row__left">
                        <div className="admin-avatar-status">
                          <ProfileAvatar avatar={p.profileAvatar ?? 0} size={34} />
                          <span
                            className={`admin-status-dot online ${p.status === 'watching' ? 'watching' : 'browsing'
                              }`}
                          />
                        </div>
                        <div className="admin-active-row__info">
                          <div className="admin-active-row__name">
                            <span>{p.displayName}</span>
                            {p.isAuthenticated ? (
                              <span className="admin-mini-badge admin-mini-badge--account">
                                <UserCheck size={10} /> Account
                              </span>
                            ) : (
                              <span className="admin-mini-badge admin-mini-badge--guest">Guest</span>
                            )}
                            {isApkSession && (
                              <span className="admin-mini-badge admin-mini-badge--apk">
                                <Smartphone size={10} /> Android APK
                              </span>
                            )}
                            <span className="admin-mini-badge">{p.profileName}</span>
                          </div>
                          <div className="admin-active-row__sub">
                            {dir?.email ? <span>{dir.email}</span> : <span>{p.platform}</span>}
                            <span>·</span>
                            <span>Route: {formatRouteLabel(p.route)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="admin-active-row__right">
                        <span className="admin-state-chip admin-state-chip--browsing">
                          Online · {formatRouteLabel(p.route)}
                        </span>

                        {p.status === 'watching' && p.titleName && (
                          <span className="admin-state-chip admin-state-chip--watching">
                            <Play size={11} />
                            <span>
                              Watching: {p.titleName}
                              {p.titleType === 'series' && p.season && p.episode
                                ? ` · S${p.season}E${p.episode}`
                                : ''}
                            </span>
                          </span>
                        )}

                        <span className="admin-uptime">
                          <PlatformIcon platform={p.platform} />
                          <span>{formatClockDuration(onlineSec)}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="admin-panel admin-feed-panel" aria-labelledby="realtime-feed-heading">
            <div className="admin-panel__header">
              <div className="admin-panel__title-wrap">
                <h2 id="realtime-feed-heading" className="admin-panel__title">
                  Realtime Activity Feed
                </h2>
              </div>
              {feedEvents.length > 0 && (
                <button
                  type="button"
                  className="admin-clear-btn"
                  onClick={() => setFeedEvents([])}
                >
                  Clear
                </button>
              )}
            </div>

            {feedEvents.length === 0 ? (
              <div className="admin-empty admin-empty--compact">
                <Activity size={22} />
                <h3>Listening for live events</h3>
                <p>Presence joins, stream starts, episode switches, and DB updates stream here in real time.</p>
              </div>
            ) : (
              <ul className="admin-feed-list">
                {feedEvents.map((ev) => (
                  <li key={ev.id} className={`admin-feed-item admin-feed-item--${ev.kind}`}>
                    <span className="admin-feed-dot" />
                    <div className="admin-feed-item__content">
                      <div className="admin-feed-item__top">
                        <strong>{ev.title}</strong>
                        <span>{formatRelativeAge(ev.at, nowMs)}</span>
                      </div>
                      <p>{ev.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>

        {/* 4. Android APK Downloads & App Telemetry */}
        <section
          ref={apkSectionRef}
          id="apk-monitoring-section"
          className="admin-panel"
          aria-labelledby="apk-monitoring-heading"
        >
          <div className="admin-panel__header">
            <div className="admin-panel__title-wrap">
              <span className="admin-apk-badge">
                <Smartphone size={13} aria-hidden="true" />
                <span>ANDROID APK</span>
              </span>
              <h2 id="apk-monitoring-heading" className="admin-panel__title">
                Android APK Downloads &amp; App Telemetry ({apkDownloadsTotalCount})
              </h2>
            </div>

            <div className="admin-panel__controls">
              <div className="admin-filter-pills" role="group" aria-label="Filter APK download source">
                {(
                  [
                    ['all', `All (${apkDownloads.length})`],
                    ['popup', `Popup (${apkCountBySource.popup})`],
                    ['footer', `Footer (${apkCountBySource.footer})`],
                    ['profile_menu', `Profile Menu (${apkCountBySource.profile_menu})`],
                  ] as [ApkSourceFilter, string][]
                ).map(([sourceKey, label]) => (
                  <button
                    key={sourceKey}
                    type="button"
                    className={`admin-pill-btn ${apkSourceFilter === sourceKey ? 'active' : ''}`}
                    onClick={() => setApkSourceFilter(sourceKey)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {apkDownloadsMissing && !schemaMissing && (
            <div className="admin-banner admin-banner--warn" role="status">
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                <strong>APK Download Table Pending:</strong> Re-run <code>supabase/admin_dashboard.sql</code> in
                your Supabase SQL Editor to enable live download tracking in <code>public.apk_downloads</code>.
              </div>
            </div>
          )}

          <div className="admin-apk-stats-grid">
            <div className="admin-apk-stat-card">
              <span className="admin-apk-stat-card__label">Total APK Downloads</span>
              <span className="admin-apk-stat-card__value">
                {apkDownloadsMissing ? '—' : apkDownloadsTotalCount}
              </span>
              <span className="admin-apk-stat-card__meta">
                +{apkDownloadsTodayCount} downloaded today
              </span>
            </div>

            <div className="admin-apk-stat-card">
              <span className="admin-apk-stat-card__label">Android Popup</span>
              <span className="admin-apk-stat-card__value">{apkCountBySource.popup}</span>
              <span className="admin-apk-stat-card__meta">
                {apkPopupSharePct}% of tracked downloads
              </span>
            </div>

            <div className="admin-apk-stat-card">
              <span className="admin-apk-stat-card__label">Footer &amp; Profile Menu</span>
              <span className="admin-apk-stat-card__value">
                {apkCountBySource.footer + apkCountBySource.profile_menu}
              </span>
              <span className="admin-apk-stat-card__meta">
                {apkCountBySource.footer} footer · {apkCountBySource.profile_menu} profile menu
              </span>
            </div>

            <div className="admin-apk-stat-card">
              <span className="admin-apk-stat-card__label">Active in Android APK</span>
              <span className="admin-apk-stat-card__value">{androidAppOnlineCount}</span>
              <span className="admin-apk-stat-card__meta">
                {androidAppWatchingCount} watching now · {registeredAndroidAppUsersCount} registered app users
              </span>
            </div>
          </div>

          {filteredApkDownloads.length === 0 ? (
            <div className="admin-empty admin-empty--compact">
              <Download size={22} />
              <h3>
                {apkDownloadsMissing
                  ? 'Run admin_dashboard.sql to track APK downloads'
                  : 'No APK downloads recorded yet'}
              </h3>
              <p>
                {apkDownloadsMissing
                  ? 'Apply the updated supabase/admin_dashboard.sql migration so downloads from the Android prompt, footer, and profile menu appear here live.'
                  : 'Downloads from the Android popup, footer button, and profile dropdown stream here automatically via Supabase Realtime.'}
              </p>
            </div>
          ) : (
            <div className="admin-table-wrap admin-apk-table-wrap">
              <table className="admin-table admin-table--responsive">
                <thead>
                  <tr>
                    <th>Downloaded</th>
                    <th>Visitor / User</th>
                    <th>Source</th>
                    <th>Device</th>
                    <th>Version</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApkDownloads.map((dl) => {
                    const dlUser = dl.user_id ? directoryById.get(dl.user_id) : undefined;
                    return (
                      <tr key={dl.id} className="admin-table-row">
                        <td data-label="Downloaded">
                          <div className="admin-visitor-meta">
                            <strong>{formatRelativeAge(dl.created_at, nowMs)}</strong>
                            <span>{formatTimestampShort(dl.created_at)}</span>
                          </div>
                        </td>
                        <td data-label="Visitor / User">
                          <div className="admin-visitor-meta">
                            <strong>
                              {dlUser
                                ? dlUser.full_name || dlUser.email.split('@')[0] || 'Vybe Member'
                                : dl.user_id
                                  ? 'Signed-in User'
                                  : 'Guest Visitor'}
                            </strong>
                            <span>
                              {dlUser?.email ||
                                (dl.user_id
                                  ? `User ${dl.user_id.slice(0, 8)}…`
                                  : dl.session_id
                                    ? `Session ${dl.session_id.slice(0, 8)}…`
                                    : 'Anonymous web download')}
                            </span>
                          </div>
                        </td>
                        <td data-label="Source">
                          <span className={`admin-source-chip admin-source-chip--${dl.source}`}>
                            {formatApkSourceLabel(dl.source)}
                          </span>
                        </td>
                        <td data-label="Device">
                          <span className="admin-platform-cell">
                            <PlatformIcon platform={dl.platform} />
                            <span>{formatDeviceHint(dl.user_agent, dl.platform)}</span>
                          </span>
                        </td>
                        <td data-label="Version">
                          <span className="admin-count-pill">v{dl.app_version || '1.0'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 5. Registered Users Directory (Postgres + Supabase Realtime Postgres Changes) */}
        <section className="admin-panel" aria-labelledby="directory-heading">
          <div className="admin-panel__header">
            <div className="admin-panel__title-wrap">
              <h2 id="directory-heading" className="admin-panel__title">
                Registered Users Directory ({filteredDirectory.length})
              </h2>
            </div>

            <div className="admin-panel__controls">
              <div className="admin-search-box">
                <Search size={14} />
                <input
                  type="search"
                  placeholder="Search email, name, or watching..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  aria-label="Search registered users"
                />
              </div>

              <div className="admin-filter-pills" role="group" aria-label="Filter registered users">
                {(
                  [
                    ['all', `All (${enrichedDirectory.length})`],
                    ['online', `Online (${enrichedDirectory.filter((u) => u.effectiveOnline).length})`],
                    ['watching', `Watching (${enrichedDirectory.filter((u) => u.effectiveWatching).length})`],
                    ['android', `Android APK (${registeredAndroidAppUsersCount})`],
                    ['offline', `Offline (${enrichedDirectory.filter((u) => !u.effectiveOnline).length})`],
                  ] as [DirectoryFilter, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`admin-pill-btn ${directoryFilter === key ? 'active' : ''}`}
                    onClick={() => setDirectoryFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredDirectory.length === 0 ? (
            <div className="admin-empty admin-empty--compact">
              <Users size={22} />
              <h3>{schemaMissing ? 'Run admin_dashboard.sql to sync users' : 'No matching users'}</h3>
              <p>
                {schemaMissing
                  ? 'Registered accounts from Supabase Auth appear here automatically after applying supabase/admin_dashboard.sql.'
                  : 'Try adjusting your search query or filter.'}
              </p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--responsive">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Realtime Status</th>
                    <th>Platform</th>
                    <th>Profiles</th>
                    <th>Watch Stats</th>
                    <th>Joined</th>
                    <th aria-label="Inspect user details" />
                  </tr>
                </thead>
                <tbody>
                  {filteredDirectory.map((item) => {
                    const { row, live, effectiveOnline, effectiveWatching } = item;
                    const isExpanded = expandedUserId === row.user_id;
                    const watchTitle = live?.titleName || row.current_title_name;
                    const watchSeason = live?.season ?? row.current_season;
                    const watchEp = live?.episode ?? row.current_episode;
                    const effectivePlatform = live?.platform || row.platform || 'Web';
                    const isApkUser = isAndroidAppPlatform(effectivePlatform);

                    return (
                      <React.Fragment key={row.user_id}>
                        <tr
                          className={`admin-table-row ${isExpanded ? 'expanded' : ''}`}
                          onClick={() =>
                            setExpandedUserId((prev) =>
                              prev === row.user_id ? null : row.user_id
                            )
                          }
                        >
                          <td data-label="User">
                            <div className="admin-user-cell">
                              <ProfileAvatar
                                avatar={live?.profileAvatar ?? row.active_profile_avatar ?? 0}
                                size={34}
                              />
                              <div>
                                <div className="admin-user-cell__name">
                                  <span>{row.full_name || row.email.split('@')[0] || 'Vybe User'}</span>
                                  <span className="admin-provider-pill">
                                    {row.provider || 'email'}
                                  </span>
                                </div>
                                <div className="admin-user-cell__email">
                                  {row.email || row.user_id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td data-label="Status">
                            {effectiveWatching && watchTitle ? (
                              <div className="admin-cell-chips">
                                <span className="admin-state-chip admin-state-chip--browsing">
                                  Online
                                </span>
                                <span className="admin-state-chip admin-state-chip--watching">
                                  <Play size={11} />
                                  <span>
                                    {watchTitle}
                                    {watchSeason && watchEp ? ` · S${watchSeason}E${watchEp}` : ''}
                                  </span>
                                </span>
                              </div>
                            ) : effectiveOnline ? (
                              <span className="admin-state-chip admin-state-chip--browsing">
                                Online · {formatRouteLabel(live?.route || row.current_route)}
                              </span>
                            ) : (
                              <span className="admin-offline-text">
                                Last seen {formatRelativeAge(row.last_seen_at, nowMs)}
                              </span>
                            )}
                          </td>

                          <td data-label="Platform">
                            <span
                              className={`admin-platform-cell ${isApkUser ? 'admin-platform-cell--apk' : ''
                                }`}
                            >
                              <PlatformIcon platform={effectivePlatform} />
                              <span>{effectivePlatform}</span>
                            </span>
                          </td>

                          <td data-label="Profiles">
                            <span className="admin-count-pill">
                              {item.profiles.length || 1} profile{item.profiles.length === 1 ? '' : 's'}
                            </span>
                          </td>

                          <td data-label="Watch Stats">
                            <span className="admin-watch-summary">
                              {item.watchedCount} watched · {item.watchlistCount} saved
                            </span>
                          </td>

                          <td data-label="Joined" className="admin-date-cell">{formatDateShort(row.created_at)}</td>

                          <td data-label="Details" className="admin-expand-cell">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="admin-detail-row">
                            <td colSpan={7}>
                              <div className="admin-inspector">
                                <div className="admin-inspector__col">
                                  <h4>Profiles ({item.profiles.length})</h4>
                                  {item.profiles.length === 0 ? (
                                    <p className="admin-inspector__empty">No database profiles synced yet.</p>
                                  ) : (
                                    <div className="admin-inspector__profiles">
                                      {item.profiles.map((prof) => (
                                        <div key={prof.id} className="admin-inspector__profile-chip">
                                          <ProfileAvatar avatar={prof.avatar ?? 0} size={24} />
                                          <span>{prof.name}</span>
                                          {prof.is_kids && <span className="admin-kids-tag">KIDS</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="admin-inspector__col admin-inspector__col--wide">
                                  <h4>Recent Watch &amp; Library Activity</h4>
                                  {item.library.length === 0 ? (
                                    <p className="admin-inspector__empty">No watch progress or watchlist entries saved yet.</p>
                                  ) : (
                                    <div className="admin-inspector__library">
                                      {item.library.slice(0, 8).map((entry) => {
                                        const meta = resolveTitleMeta(entry.title_id);
                                        const dur = Math.max(1, entry.duration || 5400);
                                        const pct = Math.min(
                                          100,
                                          Math.round(((entry.position || 0) / dur) * 100)
                                        );
                                        return (
                                          <div
                                            key={`${entry.profile_id}-${entry.title_id}`}
                                            className="admin-inspector__lib-item"
                                          >
                                            <div className="admin-inspector__lib-title">
                                              <strong>{meta.name}</strong>
                                              <span>{formatRelativeAge(entry.updated_at, nowMs)}</span>
                                            </div>
                                            <div className="admin-inspector__lib-meta">
                                              {entry.position > 0 && (
                                                <span>
                                                  {formatClockDuration(entry.position)} watched ({pct}%)
                                                </span>
                                              )}
                                              {entry.in_watchlist && (
                                                <span className="admin-mini-badge">My List</span>
                                              )}
                                              {entry.is_liked && (
                                                <span className="admin-mini-badge admin-mini-badge--liked">
                                                  <Heart size={10} /> Liked
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
