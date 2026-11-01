import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_PROFILES, MAX_PROFILES } from '../data/profiles';
import type { Profile, ProfileData, ProgressEntry } from '../types';
import { readJSON, writeJSON } from '../utils/storage';
import { useAuth } from './AuthContext';
import {
  fetchFromSupabase,
  saveProfileToDb,
  deleteProfileFromDb,
  saveLibraryItemToDb,
  syncFullStateToSupabase,
  type RemoteLibraryResult,
} from '../services/supabaseLibraryService';

interface PersistedState {
  profiles: Profile[];
  activeId: string | null;
  data: Record<string, ProfileData>;
}

const emptyData = (): ProfileData => ({
  myList: [],
  likes: [],
  progress: [],
  readNotifications: [],
});

/**
 * Validates and sanitizes raw state from localStorage or network to guarantee
 * that profiles, activeId, and per-profile library arrays always exist and are safe.
 */
function sanitizePersistedState(stored: any): PersistedState {
  const defaultAlex: Profile[] = [{ id: 'p-alex', name: 'Alex', avatar: 0, kids: false }];
  if (!stored || typeof stored !== 'object') {
    return {
      profiles: defaultAlex,
      activeId: defaultAlex[0].id,
      data: { 'p-alex': emptyData() },
    };
  }

  const profiles: Profile[] =
    Array.isArray(stored.profiles) && stored.profiles.length > 0
      ? stored.profiles.map((p: any, idx: number) => ({
          id: p?.id || `p-${idx}`,
          name: p?.name || 'Alex',
          avatar: typeof p?.avatar === 'number' ? p.avatar : 0,
          kids: !!p?.kids,
        }))
      : defaultAlex;

  const activeId =
    stored.activeId && profiles.some((p) => p.id === stored.activeId)
      ? stored.activeId
      : profiles[0].id;

  const rawData = stored.data && typeof stored.data === 'object' ? stored.data : {};
  const data: Record<string, ProfileData> = {};

  for (const p of profiles) {
    const d = rawData[p.id];
    data[p.id] = {
      myList: Array.isArray(d?.myList) ? d.myList.filter(Boolean) : [],
      likes: Array.isArray(d?.likes) ? d.likes.filter(Boolean) : [],
      progress: Array.isArray(d?.progress) ? d.progress.filter((x: any) => x && x.titleId) : [],
      readNotifications: Array.isArray(d?.readNotifications) ? d.readNotifications.filter(Boolean) : [],
    };
  }

  return { profiles, activeId, data };
}

/**
 * Loads the initial state for the given user:
 * 1. From user-specific localStorage cache
 * 2. From user_metadata in Supabase auth
 * 3. Fallback: Exactly 1 profile named Alex with empty data
 */
function loadInitialState(user: any): PersistedState {
  // 1. Check user-specific localStorage
  const userKey = user?.id ? `vybe:user:${user.id}` : 'vybe:user:guest';
  const stored = readJSON<any>(userKey, null);
  if (stored) {
    return sanitizePersistedState(stored);
  }

  // 2. Check user.user_metadata if available from Supabase Auth
  if (user?.user_metadata?.vybe_profiles?.length) {
    return sanitizePersistedState({
      profiles: user.user_metadata.vybe_profiles,
      activeId: user.user_metadata.vybe_active_id,
      data: user.user_metadata.vybe_data,
    });
  }

  // 3. Clean default
  return sanitizePersistedState(null);
}

/**
 * Cleanly merges local and remote Supabase state without erasing any data
 */
function mergeRemoteAndLocal(local: PersistedState, remote: RemoteLibraryResult): PersistedState {
  const safeLocal = sanitizePersistedState(local);
  const safeRemoteData = remote?.data && typeof remote.data === 'object' ? remote.data : {};
  const safeRemoteProfiles = Array.isArray(remote?.profiles) ? remote.profiles : [];

  // 1. Merge profiles
  const profileMap = new Map<string, Profile>();
  safeRemoteProfiles.forEach((p) => {
    if (p?.id) profileMap.set(p.id, p);
  });
  safeLocal.profiles.forEach((p) => {
    if (p?.id && !profileMap.has(p.id)) profileMap.set(p.id, p);
  });

  const profiles = Array.from(profileMap.values());
  if (profiles.length === 0) {
    profiles.push({ id: 'p-alex', name: 'Alex', avatar: 0, kids: false });
  }

  const activeId =
    safeLocal.activeId && profiles.some((p) => p.id === safeLocal.activeId)
      ? safeLocal.activeId
      : remote?.activeId && profiles.some((p) => p.id === remote.activeId)
      ? remote.activeId
      : profiles[0].id;

  // 2. Merge library data per profile
  const allPids = new Set<string>([
    ...Object.keys(safeLocal.data),
    ...Object.keys(safeRemoteData),
    ...profiles.map((p) => p.id),
  ]);
  const mergedData: Record<string, ProfileData> = {};

  for (const pid of allPids) {
    const loc = safeLocal.data[pid] ?? emptyData();
    const rawRem = safeRemoteData[pid];
    const rem: ProfileData = {
      myList: Array.isArray(rawRem?.myList) ? rawRem.myList : [],
      likes: Array.isArray(rawRem?.likes) ? rawRem.likes : [],
      progress: Array.isArray(rawRem?.progress) ? rawRem.progress : [],
      readNotifications: Array.isArray(rawRem?.readNotifications) ? rawRem.readNotifications : [],
    };

    // Merge My List (preserve unique IDs)
    const myList = Array.from(new Set([...loc.myList, ...rem.myList]));

    // Merge Likes
    const likes = Array.from(new Set([...loc.likes, ...rem.likes]));

    // Merge Progress (preserve latest watched timestamp)
    const progressMap = new Map<string, ProgressEntry>();
    rem.progress.forEach((p) => {
      if (p?.titleId) progressMap.set(p.titleId, p);
    });
    loc.progress.forEach((p) => {
      if (p?.titleId) {
        const existing = progressMap.get(p.titleId);
        if (!existing || (p.updatedAt || 0) >= (existing.updatedAt || 0)) {
          progressMap.set(p.titleId, p);
        }
      }
    });
    const progress = Array.from(progressMap.values()).sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
    );

    // Merge read notifications
    const readNotifications = Array.from(
      new Set([...loc.readNotifications, ...rem.readNotifications])
    );

    mergedData[pid] = { myList, likes, progress, readNotifications };
  }

  return { profiles, activeId, data: mergedData };
}

// ── Contexts ────────────────────────────────────────────────────────

interface ProfilesValue {
  profiles: Profile[];
  activeProfile: Profile | null;
  canAddProfile: boolean;
  selectProfile: (id: string) => void;
  signOut: () => void;
  addProfile: (p: Omit<Profile, 'id'>) => void;
  updateProfile: (id: string, patch: Partial<Omit<Profile, 'id'>>) => void;
  deleteProfile: (id: string) => void;
}

interface LibraryValue {
  myList: string[];
  likes: string[];
  progress: ProgressEntry[];
  readNotifications: string[];
  isInList: (id: string) => boolean;
  toggleList: (id: string, force?: boolean) => boolean;
  isLiked: (id: string) => boolean;
  toggleLike: (id: string, force?: boolean) => boolean;
  getProgress: (titleId: string) => ProgressEntry | undefined;
  saveProgress: (entry: Omit<ProgressEntry, 'updatedAt'>) => void;
  removeProgress: (titleId: string) => void;
  restoreProgress: (entry: ProgressEntry) => void;
  clearHistory: () => void;
  clearMyList: () => void;
  markNotificationsRead: (ids: string[]) => void;
}

const ProfilesContext = createContext<ProfilesValue | null>(null);
const LibraryContext = createContext<LibraryValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id || null;
  const storageKey = userId ? `vybe:user:${userId}` : 'vybe:user:guest';

  const [state, setState] = useState<PersistedState>(() => loadInitialState(user));
  const syncTimeoutRef = useRef<any>(null);
  const isRemoteLoadedRef = useRef<boolean>(false);

  // 1. When user account changes (sign in, sign up, switch user, or sign out)
  useEffect(() => {
    isRemoteLoadedRef.current = false;
    const initial = loadInitialState(user);
    setState(initial);

    // Asynchronous Supabase sync
    if (user?.id && !user.id.startsWith('demo-')) {
      let isMounted = true;
      fetchFromSupabase(user)
        .then((remote) => {
          if (!isMounted) return;
          if (remote) {
            setState((current) => {
              const merged = mergeRemoteAndLocal(current, remote);
              writeJSON(storageKey, merged);
              return merged;
            });
          }
          isRemoteLoadedRef.current = true;
        })
        .catch((err) => {
          console.warn('Error fetching from Supabase:', err);
          if (isMounted) isRemoteLoadedRef.current = true;
        });

      return () => {
        isMounted = false;
      };
    } else {
      isRemoteLoadedRef.current = true;
    }
  }, [user?.id, storageKey]);

  // 2. Persist to user-specific localStorage and sync to Supabase account
  useEffect(() => {
    writeJSON(storageKey, state);

    // Guard against overwriting remote Supabase state before initial remote fetch finishes
    if (!isRemoteLoadedRef.current) {
      return;
    }

    if (userId && !userId.startsWith('demo-')) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncFullStateToSupabase(userId, state.profiles, state.activeId, state.data);
      }, 800);
    }

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [state, storageKey, userId]);

  // 3. Keep tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          setState(sanitizePersistedState(JSON.parse(e.newValue)));
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  // Active Profile & Per-Profile Data Isolation
  const activeProfile =
    state.profiles.find((p) => p.id === state.activeId) ?? state.profiles[0] ?? null;
  const activeData = (activeProfile && state?.data?.[activeProfile.id]) || emptyData();

  // Always-current snapshot for callbacks
  const latest = useRef<ProfileData>(emptyData());
  latest.current = activeData;

  const updateActive = useCallback(
    (fn: (d: ProfileData) => ProfileData) => {
      setState((s) => {
        const safe = sanitizePersistedState(s);
        const currentActiveId = safe.activeId || safe.profiles[0]?.id;
        if (!currentActiveId) return safe;
        const current = safe.data[currentActiveId] ?? emptyData();
        return {
          ...safe,
          data: {
            ...safe.data,
            [currentActiveId]: fn(current),
          },
        };
      });
    },
    []
  );

  const profilesValue = useMemo<ProfilesValue>(
    () => ({
      profiles: state.profiles,
      activeProfile,
      canAddProfile: state.profiles.length < MAX_PROFILES,
      selectProfile: (id) => {
        setState((s) => ({ ...s, activeId: id }));
      },
      signOut: () => setState((s) => ({ ...s, activeId: null })),
      addProfile: (p) => {
        const newId = `p-${Date.now().toString(36)}`;
        const newProfile = { ...p, id: newId };
        setState((s) => {
          if (s.profiles.length >= MAX_PROFILES) return s;
          return {
            ...s,
            profiles: [...s.profiles, newProfile],
            data: {
              ...s.data,
              [newId]: emptyData(),
            },
          };
        });
        if (userId && !userId.startsWith('demo-')) {
          saveProfileToDb(userId, newProfile);
        }
      },
      updateProfile: (id, patch) => {
        setState((s) => ({
          ...s,
          profiles: s.profiles.map((p) => {
            if (p.id === id) {
              const updated = { ...p, ...patch };
              if (userId && !userId.startsWith('demo-')) saveProfileToDb(userId, updated);
              return updated;
            }
            return p;
          }),
        }));
      },
      deleteProfile: (id) => {
        setState((s) => {
          if (s.profiles.length <= 1) return s;
          const data = { ...s.data };
          delete data[id];
          const remainingProfiles = s.profiles.filter((p) => p.id !== id);
          return {
            profiles: remainingProfiles,
            activeId: s.activeId === id ? remainingProfiles[0]?.id || null : s.activeId,
            data,
          };
        });
        if (userId && !userId.startsWith('demo-')) {
          deleteProfileFromDb(userId, id);
        }
      },
    }),
    [state.profiles, activeProfile, userId]
  );

  const libraryValue = useMemo<LibraryValue>(() => {
    const d = activeData;
    const currentActiveId = activeProfile?.id || 'p-alex';

    return {
      myList: d.myList,
      likes: d.likes,
      progress: [...d.progress].sort((a, b) => b.updatedAt - a.updatedAt),
      readNotifications: d.readNotifications,
      isInList: (id: string) => d.myList.includes(id),
      toggleList: (id: string, force?: boolean) => {
        const adding = force ?? !latest.current.myList.includes(id);
        updateActive((x: ProfileData) => {
          const rest = x.myList.filter((i: string) => i !== id);
          return { ...x, myList: adding ? [id, ...rest] : rest };
        });
        if (userId && !userId.startsWith('demo-')) {
          const prog = latest.current.progress.find((p) => p.titleId === id);
          saveLibraryItemToDb(userId, currentActiveId, id, {
            inWatchlist: adding,
            isLiked: latest.current.likes.includes(id),
            position: prog?.position ?? 0,
            duration: prog?.duration ?? 0,
          });
        }
        return adding;
      },
      isLiked: (id: string) => d.likes.includes(id),
      toggleLike: (id: string, force?: boolean) => {
        const liking = force ?? !latest.current.likes.includes(id);
        updateActive((x: ProfileData) => {
          const rest = x.likes.filter((i: string) => i !== id);
          return { ...x, likes: liking ? [id, ...rest] : rest };
        });
        if (userId && !userId.startsWith('demo-')) {
          const prog = latest.current.progress.find((p) => p.titleId === id);
          saveLibraryItemToDb(userId, currentActiveId, id, {
            inWatchlist: latest.current.myList.includes(id),
            isLiked: liking,
            position: prog?.position ?? 0,
            duration: prog?.duration ?? 0,
          });
        }
        return liking;
      },
      getProgress: (titleId: string) =>
        d.progress.find((p: ProgressEntry) => p.titleId === titleId),
      saveProgress: (entry) => {
        updateActive((x: ProfileData) => ({
          ...x,
          progress: [
            { ...entry, updatedAt: Date.now() },
            ...x.progress.filter((p: ProgressEntry) => p.titleId !== entry.titleId),
          ].slice(0, 30),
        }));
        if (userId && !userId.startsWith('demo-')) {
          saveLibraryItemToDb(userId, currentActiveId, entry.titleId, {
            inWatchlist: latest.current.myList.includes(entry.titleId),
            isLiked: latest.current.likes.includes(entry.titleId),
            position: entry.position,
            duration: entry.duration,
          });
        }
      },
      removeProgress: (titleId: string) => {
        updateActive((x: ProfileData) => ({
          ...x,
          progress: x.progress.filter((p: ProgressEntry) => p.titleId !== titleId),
        }));
        if (userId && !userId.startsWith('demo-')) {
          saveLibraryItemToDb(userId, currentActiveId, titleId, {
            inWatchlist: latest.current.myList.includes(titleId),
            isLiked: latest.current.likes.includes(titleId),
            position: 0,
            duration: 0,
          });
        }
      },
      restoreProgress: (entry) => {
        updateActive((x: ProfileData) => ({
          ...x,
          progress: [
            entry,
            ...x.progress.filter((p: ProgressEntry) => p.titleId !== entry.titleId),
          ],
        }));
        if (userId && !userId.startsWith('demo-')) {
          saveLibraryItemToDb(userId, currentActiveId, entry.titleId, {
            inWatchlist: latest.current.myList.includes(entry.titleId),
            isLiked: latest.current.likes.includes(entry.titleId),
            position: entry.position,
            duration: entry.duration,
          });
        }
      },
      clearHistory: () => {
        updateActive((x: ProfileData) => ({
          ...x,
          progress: [],
        }));
      },
      clearMyList: () => {
        updateActive((x: ProfileData) => ({
          ...x,
          myList: [],
        }));
      },
      markNotificationsRead: (ids: string[]) =>
        updateActive((x: ProfileData) => ({
          ...x,
          readNotifications: [...new Set([...x.readNotifications, ...ids])],
        })),
    };
  }, [activeData, activeProfile?.id, updateActive, userId]);

  return (
    <ProfilesContext.Provider value={profilesValue}>
      <LibraryContext.Provider value={libraryValue}>{children}</LibraryContext.Provider>
    </ProfilesContext.Provider>
  );
}

export function useProfiles(): ProfilesValue {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error('useProfiles must be used within ProfileProvider');
  return ctx;
}

export function useLibrary(): LibraryValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within ProfileProvider');
  return ctx;
}
