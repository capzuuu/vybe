import type {
  UserReview,
  EpisodeDiscussion,
  PublicList,
  Recommendation,
} from '../types/community';

const STORAGE_KEY = 'vybe:community:v2';

// Clear legacy cached static data from v1
try {
  localStorage.removeItem('vybe:community:cache:v1');
} catch {}

export interface CommunityStorageState {
  reviews: UserReview[];
  lists: PublicList[];
  recommendations: Recommendation[];
  discussions: EpisodeDiscussion[];
  likedIds: string[];
}

export function loadCommunityState(): CommunityStorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
        lists: Array.isArray(parsed.lists) ? parsed.lists : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        discussions: Array.isArray(parsed.discussions) ? parsed.discussions : [],
        likedIds: Array.isArray(parsed.likedIds) ? parsed.likedIds : [],
      };
    }
  } catch {}

  return {
    reviews: [],
    lists: [],
    recommendations: [],
    discussions: [],
    likedIds: [],
  };
}

export function saveCommunityState(state: CommunityStorageState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function formatCommunityTime(isoString?: string): string {
  if (!isoString) return 'Recently';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}
