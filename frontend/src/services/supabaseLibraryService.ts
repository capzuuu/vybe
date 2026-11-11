import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile, ProfileData, ProgressEntry } from '../types';

export interface RemoteLibraryResult {
  profiles: Profile[];
  activeId: string | null;
  data: Record<string, ProfileData>;
  isFromDatabase: boolean;
}

// Module-level cache to track if database tables exist, avoiding repeated 404 network requests
let isUserProfileTableAvailable: boolean | null = null;

// Singleflight coalescing state for full Supabase syncs to prevent write storms
interface SyncSnapshot {
  userId: string;
  profiles: Profile[];
  activeId: string | null;
  data: Record<string, ProfileData>;
  syncAuthMetadata?: boolean;
}
let syncInFlight: Promise<void> | null = null;
let pendingSyncSnapshot: SyncSnapshot | null = null;

function clampNonNegativeInt(value: unknown, max = 86400 * 10): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.min(max, Math.round(num));
}

function sanitizeProfileName(name: unknown): string {
  const cleaned = typeof name === 'string' ? name.replace(/[\x00-\x1f\x7f]/g, '').trim() : '';
  return cleaned.slice(0, 40) || 'Viewer';
}

export interface LibraryItemPayload {
  inWatchlist: boolean;
  isLiked: boolean;
  position: number;
  duration: number;
}

const emptyData = (): ProfileData => ({
  myList: [],
  likes: [],
  progress: [],
  readNotifications: [],
});

/**
 * Fetches user profiles and library (My List, Recent Watch, Likes) from Supabase:
 * 1. Queries `user_profiles` and `user_library` tables if present.
 * 2. Gracefully falls back to Supabase `user_metadata` if tables are not yet migrated.
 * 3. If user is brand new, defaults to exactly 1 profile named Alex.
 */
export async function fetchFromSupabase(user: any): Promise<RemoteLibraryResult | null> {
  if (!isSupabaseConfigured() || !user?.id || user.id.startsWith('demo-')) {
    return null;
  }

  const userId = user.id;

  // Obtain fresh user record to read latest user_metadata directly from Supabase Auth
  let freshUser = user;
  try {
    const { data: freshData } = await supabase.auth.getUser();
    if (freshData?.user) {
      freshUser = freshData.user;
    }
  } catch {
    // Keep user from argument
  }

  try {
    // Only attempt database query if not previously determined to be absent
    if (isUserProfileTableAvailable !== false) {
      // 1 & 2. Fetch profiles and library items simultaneously for 2x faster startup
      const [profilesRes, libraryRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, name, avatar, is_kids, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
        supabase
          .from('user_library')
          .select('profile_id, title_id, in_watchlist, is_liked, position, duration, updated_at')
          .eq('user_id', userId),
      ]);

      const { data: dbProfiles, error: profileErr } = profilesRes;
      const { data: dbLibrary, error: libErr } = libraryRes;

      if (profileErr) {
        const isMissingTable =
          profileErr.code === 'PGRST204' ||
          profileErr.code === '42P01' ||
          profileErr.message?.includes('schema cache') ||
          profileErr.message?.includes('does not exist') ||
          (profileErr as any).status === 404;
        if (isMissingTable) {
          isUserProfileTableAvailable = false;
        }
      } else {
        isUserProfileTableAvailable = true;
      }

      // If table exists without error
      if (!profileErr && Array.isArray(dbProfiles)) {
      let profiles: Profile[] = dbProfiles.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar ?? 0,
        kids: Boolean(p.is_kids),
      }));

      // If user had existing data in user_metadata before table migration, migrate it
      if (profiles.length === 0 && freshUser?.user_metadata?.vybe_profiles?.length) {
        profiles = freshUser.user_metadata.vybe_profiles as Profile[];
        for (const p of profiles) {
          await saveProfileToDb(userId, p);
        }
      }

      // Brand new user: insert exactly 1 profile named Alex
      if (profiles.length === 0) {
        const defaultAlex: Profile = { id: 'p-alex', name: 'Alex', avatar: 0, kids: false };
        await saveProfileToDb(userId, defaultAlex);
        profiles = [defaultAlex];
      }

      const data: Record<string, ProfileData> = {};
      profiles.forEach((p) => {
        data[p.id] = emptyData();
      });

      if (!libErr && Array.isArray(dbLibrary) && dbLibrary.length > 0) {
        for (const row of dbLibrary) {
          const pid = row.profile_id;
          if (!data[pid]) {
            data[pid] = emptyData();
          }

          if (row.in_watchlist && !data[pid].myList.includes(row.title_id)) {
            data[pid].myList.push(row.title_id);
          }

          if (row.is_liked && !data[pid].likes.includes(row.title_id)) {
            data[pid].likes.push(row.title_id);
          }

          if (row.position > 0) {
            data[pid].progress.push({
              titleId: row.title_id,
              position: row.position,
              duration: row.duration || 5400,
              updatedAt: row.updated_at ? +new Date(row.updated_at) : Date.now(),
            });
          }
        }

        // Sort progress by most recently watched
        Object.keys(data).forEach((pid) => {
          data[pid].progress.sort((a, b) => b.updatedAt - a.updatedAt);
        });
      } else if (freshUser?.user_metadata?.vybe_data) {
        // Fallback to user_metadata data if table was empty
        const metaData = freshUser.user_metadata.vybe_data as Record<string, ProfileData>;
        profiles.forEach((p) => {
          if (metaData[p.id]) {
            data[p.id] = metaData[p.id];
          }
        });
      }

      const activeId =
        freshUser?.user_metadata?.vybe_active_id &&
          profiles.some((p) => p.id === freshUser.user_metadata.vybe_active_id)
          ? freshUser.user_metadata.vybe_active_id
          : profiles[0]?.id || 'p-alex';

      return {
        profiles,
        activeId,
        data,
        isFromDatabase: true,
      };
    }
    }
  } catch (err) {
    console.warn('Error reading from Supabase tables, falling back to metadata:', err);
  }

  // Fallback: If tables not yet run in Supabase, load from freshUser.user_metadata
  if (freshUser?.user_metadata?.vybe_profiles?.length) {
    const profiles = freshUser.user_metadata.vybe_profiles as Profile[];
    const activeId = freshUser.user_metadata.vybe_active_id || profiles[0]?.id || 'p-alex';
    const data = (freshUser.user_metadata.vybe_data as Record<string, ProfileData>) || {};
    return { profiles, activeId, data, isFromDatabase: false };
  }

  // Default for new account without tables: 1 profile named Alex
  const defaultAlex: Profile = { id: 'p-alex', name: 'Alex', avatar: 0, kids: false };
  return {
    profiles: [defaultAlex],
    activeId: defaultAlex.id,
    data: { [defaultAlex.id]: emptyData() },
    isFromDatabase: false,
  };
}

/**
 * Saves or updates a profile in the `user_profiles` table.
 */
export async function saveProfileToDb(userId: string, profile: Profile): Promise<void> {
  if (!isSupabaseConfigured() || !userId || userId.startsWith('demo-')) return;
  if (isUserProfileTableAvailable === false) return;
  try {
    const { error } = await supabase.from('user_profiles').upsert({
      id: profile.id,
      user_id: userId,
      name: sanitizeProfileName(profile.name),
      avatar: Math.max(0, Math.min(20, Math.trunc(Number(profile.avatar) || 0))),
      is_kids: Boolean(profile.kids),
      updated_at: new Date().toISOString(),
    });
    if (error && (error.code === 'PGRST204' || (error as any).status === 404)) {
      isUserProfileTableAvailable = false;
    }
  } catch (err) {
    console.warn('Error saving profile to database:', err);
  }
}

/**
 * Deletes a profile from `user_profiles` and cascades deletion of its library data.
 */
export async function deleteProfileFromDb(userId: string, profileId: string): Promise<void> {
  if (!isSupabaseConfigured() || !userId || userId.startsWith('demo-')) return;
  if (isUserProfileTableAvailable === false) return;
  try {
    await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId)
      .eq('id', profileId);

    await supabase
      .from('user_library')
      .delete()
      .eq('user_id', userId)
      .eq('profile_id', profileId);
  } catch (err) {
    console.warn('Error deleting profile from database:', err);
  }
}

/**
 * Upserts a library item (watchlist toggle, playback progress, or like) to `user_library`.
 * If an item is neither in watchlist, nor liked, nor has progress, it is removed from the table.
 */
export async function saveLibraryItemToDb(
  userId: string,
  profileId: string,
  titleId: string,
  item: LibraryItemPayload
): Promise<void> {
  if (!isSupabaseConfigured() || !userId || userId.startsWith('demo-')) return;
  if (isUserProfileTableAvailable === false) return;
  try {
    const hasProgress = (item.position ?? 0) > 0;
    const isSaved = item.inWatchlist || item.isLiked || hasProgress;

    if (!isSaved) {
      await supabase
        .from('user_library')
        .delete()
        .eq('user_id', userId)
        .eq('profile_id', profileId)
        .eq('title_id', titleId);
      return;
    }

    const { error } = await supabase.from('user_library').upsert({
      user_id: userId,
      profile_id: profileId,
      title_id: titleId,
      in_watchlist: Boolean(item.inWatchlist),
      is_liked: Boolean(item.isLiked),
      position: clampNonNegativeInt(item.position),
      duration: clampNonNegativeInt(item.duration),
      updated_at: new Date().toISOString(),
    });
    if (error && (error.code === 'PGRST204' || (error as any).status === 404)) {
      isUserProfileTableAvailable = false;
    }
  } catch (err) {
    console.warn('Error saving library item to database:', err);
  }
}

async function executeFullSync(snapshot: SyncSnapshot): Promise<void> {
  const { userId, profiles, activeId, data, syncAuthMetadata = true } = snapshot;

  // Compact progress arrays so user_metadata never bloats JWT/session storage
  const compactData: Record<string, ProfileData> = {};
  for (const pid of Object.keys(data)) {
    const pData = data[pid];
    if (!pData) continue;
    compactData[pid] = {
      myList: Array.isArray(pData.myList) ? pData.myList.slice(0, 200) : [],
      likes: Array.isArray(pData.likes) ? pData.likes.slice(0, 200) : [],
      progress: Array.isArray(pData.progress) ? pData.progress.slice(0, 30) : [],
      readNotifications: Array.isArray(pData.readNotifications) ? pData.readNotifications.slice(-60) : [],
    };
  }

  // 1. Update user_metadata only when database tables are unavailable or explicitly requested
  if (syncAuthMetadata || isUserProfileTableAvailable === false) {
    try {
      await supabase.auth.updateUser({
        data: {
          vybe_profiles: profiles,
          vybe_active_id: activeId,
          vybe_data: compactData,
          vybe_synced_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.warn('Error saving to user_metadata:', err);
    }
  }

  if (isUserProfileTableAvailable === false) return;

  // 2. High-performance batch database tables sync (if tables exist)
  try {
    // 2a. Bulk upsert profiles in a single query
    if (profiles.length > 0) {
      const { error: upsertProfilesErr } = await supabase.from('user_profiles').upsert(
        profiles.map((p) => ({
          id: p.id,
          user_id: userId,
          name: sanitizeProfileName(p.name),
          avatar: Math.max(0, Math.min(20, Math.trunc(Number(p.avatar) || 0))),
          is_kids: Boolean(p.kids),
          updated_at: new Date().toISOString(),
        }))
      );
      if (upsertProfilesErr && (upsertProfilesErr.code === 'PGRST204' || (upsertProfilesErr as any).status === 404)) {
        isUserProfileTableAvailable = false;
        // Fallback to user_metadata immediately so state isn't lost
        try {
          await supabase.auth.updateUser({
            data: {
              vybe_profiles: profiles,
              vybe_active_id: activeId,
              vybe_data: compactData,
              vybe_synced_at: new Date().toISOString(),
            },
          });
        } catch {}
        return;
      }
    }

    // 2b. Collect all library items across profiles for single chunked batch upsert
    const rowsToUpsert: any[] = [];
    for (const pid of Object.keys(compactData)) {
      const pData = compactData[pid];
      if (!pData) continue;

      const progressById = new Map<string, ProgressEntry>();
      for (const pr of pData.progress) {
        if (pr?.titleId) progressById.set(pr.titleId, pr);
      }
      const watchlistSet = new Set(pData.myList);
      const likesSet = new Set(pData.likes);
      const allTitleIds = new Set<string>([
        ...pData.myList,
        ...pData.likes,
        ...pData.progress.map((pr) => pr.titleId),
      ]);

      for (const titleId of allTitleIds) {
        const prog = progressById.get(titleId);
        const inWatchlist = watchlistSet.has(titleId);
        const isLiked = likesSet.has(titleId);
        const position = clampNonNegativeInt(prog?.position);
        const duration = clampNonNegativeInt(prog?.duration);

        if (inWatchlist || isLiked || position > 0) {
          rowsToUpsert.push({
            user_id: userId,
            profile_id: pid,
            title_id: titleId,
            in_watchlist: inWatchlist,
            is_liked: isLiked,
            position,
            duration,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    // 2c. Chunked bulk upsert (100 rows per batch) for optimal throughput
    const CHUNK_SIZE = 100;
    for (let i = 0; i < rowsToUpsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToUpsert.slice(i, i + CHUNK_SIZE);
      await supabase.from('user_library').upsert(chunk);
    }
  } catch (err) {
    console.warn('Error syncing to database tables:', err);
  }
}

/**
 * Full synchronization to Supabase with singleflight coalescing so rapid updates
 * collapse into at most one active request plus one trailing latest snapshot.
 */
export async function syncFullStateToSupabase(
  userId: string,
  profiles: Profile[],
  activeId: string | null,
  data: Record<string, ProfileData>,
  options?: { syncAuthMetadata?: boolean }
): Promise<void> {
  if (!isSupabaseConfigured() || !userId || userId.startsWith('demo-')) return;

  const snapshot: SyncSnapshot = {
    userId,
    profiles,
    activeId,
    data,
    syncAuthMetadata: options?.syncAuthMetadata ?? true,
  };

  if (syncInFlight) {
    pendingSyncSnapshot = {
      ...snapshot,
      syncAuthMetadata: Boolean(pendingSyncSnapshot?.syncAuthMetadata || snapshot.syncAuthMetadata),
    };
    return syncInFlight;
  }

  syncInFlight = (async () => {
    let next: SyncSnapshot | null = snapshot;
    while (next) {
      await executeFullSync(next);
      next = pendingSyncSnapshot;
      pendingSyncSnapshot = null;
    }
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}
