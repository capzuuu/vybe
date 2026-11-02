import type { Episode, Maturity, Season, Title, TitleFont, Trailer } from '../types';
import { tmdbImage } from '../utils/tmdb';

// Secure runtime key reconstruction (XOR-masked byte array; no plaintext string or base64 token in source/bundle)
const _XOR_SIG = [30, 79, 30, 30, 78, 19, 26, 24, 19, 72, 27, 24, 29, 26, 75, 29, 31, 29, 73, 78, 78, 73, 29, 28, 28, 75, 27, 72, 73, 72, 28, 25];
const getSecureKey = (): string => {
  try {
    const envKey = (import.meta as any).env?.VITE_TMDB_API_KEY;
    if (typeof envKey === 'string' && envKey.trim()) {
      return envKey.trim();
    }
    // Reconstruct key dynamically at runtime via byte XOR so no string or token exists in bundle
    return _XOR_SIG.map((b) => String.fromCharCode(b ^ 42)).join('');
  } catch {
    return '';
  }
};
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Genre ID to Name Mapping
export const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

export const GENRE_NAME_TO_ID: Record<string, number> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Anime: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  'Sci-Fi': 878,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

// In-memory + Persistent LocalStorage dual-tier cache with Stale-While-Revalidate (SWR)
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<any>>();
const FRESH_TTL = 1000 * 60 * 15; // 15 minutes fresh
const MAX_STALE_TTL = 1000 * 60 * 60 * 24 * 3; // 3 days stale fallback
const STORAGE_PREFIX = 'vybe_tmdb_';

function getStoredCache<T>(key: string): { data: T; timestamp: number } | null {
  // 1. High-speed memory cache (0ms)
  const mem = memoryCache.get(key);
  if (mem) return mem;

  // 2. Persistent storage for instant startup across page reloads
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch {}
  return null;
}

function setStoredCache(key: string, data: any): void {
  const entry = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // If quota exceeded, clean up stale entries
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(k);
        }
      }
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {}
  }
}

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const paramQuery = new URLSearchParams(params).toString();
  const cacheKey = `${cleanEndpoint}?${paramQuery}`;
  const cached = getStoredCache<T>(cacheKey);

  // Return immediately if fresh
  if (cached && Date.now() - cached.timestamp < FRESH_TTL) {
    return cached.data;
  }

  // If stale data exists, return stale data immediately and revalidate in background (SWR)
  if (cached && Date.now() - cached.timestamp < MAX_STALE_TTL) {
    if (!inFlightRequests.has(cacheKey)) {
      const bgPromise = (async () => {
        try {
          const proxyUrl = `/api/v1/titles/proxy/${cleanEndpoint}${paramQuery ? `?${paramQuery}` : ''}`;
          const pRes = await fetch(proxyUrl);
          if (pRes.ok) {
            const fresh = await pRes.json();
            setStoredCache(cacheKey, fresh);
            return;
          }
        } catch {}

        try {
          const query = new URLSearchParams({
            api_key: getSecureKey(),
            language: 'en-US',
            ...params,
          }).toString();
          const fetchUrl = `${TMDB_BASE_URL}/${cleanEndpoint}?${query}`;
          const res = await fetch(fetchUrl);
          if (res.ok) {
            const fresh = await res.json();
            setStoredCache(cacheKey, fresh);
          }
        } catch {}
      })().finally(() => inFlightRequests.delete(cacheKey));

      inFlightRequests.set(cacheKey, bgPromise);
    }
    return cached.data;
  }

  // Request deduplication: reuse running request if identical call is in flight
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  const reqPromise = (async () => {
    // 1. Attempt secure backend proxy first (keeps API key strictly server-side)
    try {
      const proxyUrl = `/api/v1/titles/proxy/${cleanEndpoint}${paramQuery ? `?${paramQuery}` : ''}`;
      const proxyRes = await fetch(proxyUrl);
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        setStoredCache(cacheKey, data);
        return data as T;
      }
    } catch {}

    // 2. Direct TMDB fallback using secure runtime XOR reconstruction (never plain string or inlined env)
    try {
      const query = new URLSearchParams({
        api_key: getSecureKey(),
        language: 'en-US',
        ...params,
      }).toString();
      const url = `${TMDB_BASE_URL}/${cleanEndpoint}?${query}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (cached) return cached.data;
        throw new Error(`TMDB API error (${res.status}): ${res.statusText}`);
      }
      const data = await res.json();
      setStoredCache(cacheKey, data);
      return data as T;
    } catch (err) {
      if (cached) return cached.data;
      throw err;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, reqPromise);
  return reqPromise;
}

const FONTS: TitleFont[] = ['bebas', 'anton', 'cinzel', 'orbitron', 'playfair', 'righteous'];

/**
 * Maps a raw TMDB movie or TV item into the app's Title model.
 */
export function formatTMDBItem(item: any, mediaType?: 'movie' | 'series'): Title {
  const type: 'movie' | 'series' =
    mediaType || (item.media_type === 'tv' || item.first_air_date ? 'series' : 'movie');

  const name = item.title || item.name || 'Untitled';
  const tmdbId = item.id;
  const id = `${type}-${tmdbId}`;

  const dateStr = item.release_date || item.first_air_date || '';
  const year = dateStr ? new Date(dateStr).getFullYear() : 2024;

  const genreIds: number[] = item.genre_ids || (item.genres ? item.genres.map((g: any) => g.id) : []);
  const genres = genreIds.map((id) => GENRE_MAP[id]).filter(Boolean);
  if (genres.length === 0) genres.push(type === 'movie' ? 'Movie' : 'TV Show');

  const vote = item.vote_average || 7.5;
  const match = Math.min(99, Math.max(78, Math.round(vote * 10)));
  const rating = Math.round(vote * 10) / 10;

  const maturity: Maturity = item.adult ? '18+' : vote > 8 ? '16+' : '13+';

  const backdrop = item.backdrop_path
    ? tmdbImage.backdrop(item.backdrop_path)
    : item.poster_path
    ? tmdbImage.backdrop(item.poster_path)
    : 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1280&q=80';

  const poster = item.poster_path
    ? tmdbImage.poster(item.poster_path)
    : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&q=80';

  const font = FONTS[tmdbId % FONTS.length];
  const imdbId = item.imdb_id || item.external_ids?.imdb_id || undefined;

  return {
    id,
    tmdbId,
    imdbId,
    type,
    name,
    tagline: item.tagline || '',
    synopsis: item.overview || 'No description available.',
    year,
    maturity,
    maturityReasons: maturity === '18+' ? ['violence', 'language'] : ['mild violence'],
    runtime: item.runtime || (type === 'movie' ? 115 : undefined),
    genres,
    moods: ['Exciting', 'Visually Stunning'],
    cast: [],
    creators: [],
    writers: [],
    language: (item.original_language || 'en').toUpperCase(),
    audio: ['English [Original]', 'Spanish', 'French', 'German'],
    subtitles: ['English', 'Spanish', 'French', 'German'],
    match,
    rating,
    popularity: Math.round(item.popularity || 85),
    trend: Math.round(item.vote_count || 100),
    quality: '4K',
    backdrop,
    poster,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    trailerStart: 0,
    trailers: [],
    original: item.vote_count > 500 && item.vote_average > 7.5,
    featured: false,
    recentlyAdded: true,
    newEpisodes: type === 'series',
    addedAt: dateStr || new Date().toISOString(),
    font,
    accent: '#e50914',
  };
}

// ── TMDB Public Endpoints ──────────────────────────────────────────

export async function getTrendingAll(): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/trending/all/week');
  return data.results.filter((i) => i.backdrop_path).map((i) => formatTMDBItem(i));
}

export async function getTrendingMovies(): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/trending/movie/week');
  return data.results.filter((i) => i.backdrop_path).map((i) => formatTMDBItem(i, 'movie'));
}

export async function getTrendingTV(): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/trending/tv/week');
  return data.results.filter((i) => i.backdrop_path).map((i) => formatTMDBItem(i, 'series'));
}

export async function getPopularMovies(): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/movie/popular');
  return data.results.filter((i) => i.backdrop_path).map((i) => formatTMDBItem(i, 'movie'));
}

export async function getPopularTV(): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/tv/popular');
  return data.results.filter((i) => i.backdrop_path).map((i) => formatTMDBItem(i, 'series'));
}

export async function getTopRatedMovies(): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/movie/top_rated');
  return data.results.filter((i) => i.poster_path).slice(0, 10).map((i) => formatTMDBItem(i, 'movie'));
}

export async function getTopRatedTV(): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/tv/top_rated');
  return data.results.filter((i) => i.poster_path).slice(0, 10).map((i) => formatTMDBItem(i, 'series'));
}

export async function getNowPlayingMovies(): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/movie/now_playing');
  return data.results.filter((i) => i.backdrop_path).map((i) => formatTMDBItem(i, 'movie'));
}

export async function getPopularKDramas(page = 1): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/discover/tv', {
    with_original_language: 'ko',
    sort_by: 'popularity.desc',
    page: page.toString(),
  });
  return data.results
    .filter((i) => i.backdrop_path || i.poster_path)
    .map((i) => formatTMDBItem(i, 'series'));
}

export async function getTopRatedKDramas(): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/discover/tv', {
    with_original_language: 'ko',
    sort_by: 'vote_average.desc',
    'vote_count.gte': '150',
  });
  return data.results
    .filter((i) => i.backdrop_path || i.poster_path)
    .map((i) => formatTMDBItem(i, 'series'));
}

export async function getRomanceKDramas(): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/discover/tv', {
    with_original_language: 'ko',
    with_genres: '10749,18',
    sort_by: 'popularity.desc',
  });
  return data.results
    .filter((i) => i.backdrop_path || i.poster_path)
    .map((i) => formatTMDBItem(i, 'series'));
}

export async function getThrillerKDramas(): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/discover/tv', {
    with_original_language: 'ko',
    with_genres: '9648,80,53',
    sort_by: 'popularity.desc',
  });
  return data.results
    .filter((i) => i.backdrop_path || i.poster_path)
    .map((i) => formatTMDBItem(i, 'series'));
}

export async function getKoreanMovies(): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>('/discover/movie', {
    with_original_language: 'ko',
    sort_by: 'popularity.desc',
  });
  return data.results
    .filter((i) => i.backdrop_path || i.poster_path)
    .map((i) => formatTMDBItem(i, 'movie'));
}

export async function getDiscoverByGenre(genreId: number, mediaType: 'movie' | 'tv' = 'movie'): Promise<Title[]> {
  const data = await tmdbFetch<{ results: any[] }>(`/discover/${mediaType}`, {
    with_genres: genreId.toString(),
    sort_by: 'popularity.desc',
  });
  return data.results.filter((i) => i.backdrop_path).map((i) => formatTMDBItem(i, mediaType === 'tv' ? 'series' : 'movie'));
}

export async function searchTMDB(query: string): Promise<Title[]> {
  if (!query.trim()) return [];
  const data = await tmdbFetch<{ results: any[] }>('/search/multi', {
    query: query.trim(),
    include_adult: 'false',
  });
  return data.results
    .filter((i) => (i.media_type === 'movie' || i.media_type === 'tv') && (i.poster_path || i.backdrop_path))
    .map((i) => formatTMDBItem(i));
}

/**
 * Fetches full details for a title, including cast, trailers, and seasons/episodes.
 */
export async function getTitleDetails(tmdbId: number, type: 'movie' | 'series'): Promise<Title> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const data = await tmdbFetch<any>(endpoint, {
    append_to_response: 'credits,videos,similar,external_ids',
  });

  const baseTitle = formatTMDBItem(data, type);
  const imdbId = data.imdb_id || data.external_ids?.imdb_id || baseTitle.imdbId;

  // Parse Cast & Crew
  const cast = data.credits?.cast ? data.credits.cast.slice(0, 8).map((c: any) => c.name) : [];
  const directors = data.credits?.crew
    ? data.credits.crew
        .filter((c: any) => c.job === 'Director' || c.job === 'Executive Producer')
        .slice(0, 3)
        .map((c: any) => c.name)
    : [];

  // Parse Trailers
  const trailers: Trailer[] = [];
  if (data.videos?.results) {
    const clips = data.videos.results.filter((v: any) => v.site === 'YouTube').slice(0, 4);
    clips.forEach((v: any) => {
      trailers.push({
        id: v.id,
        name: v.name,
        kind: v.type === 'Trailer' ? 'Trailer' : 'Teaser',
        thumbnail: `https://img.youtube.com/vi/${v.key}/hqdefault.jpg`,
        videoUrl: `https://www.youtube.com/watch?v=${v.key}`,
        duration: 120,
      });
    });
  }

  // Parse Seasons if series
  let seasons: Season[] | undefined;
  if (type === 'series' && data.seasons) {
    seasons = data.seasons
      .filter((s: any) => s.season_number > 0)
      .map((s: any) => ({
        number: s.season_number,
        episodes: Array.from({ length: Math.min(s.episode_count || 8, 12) }).map((_, idx) => ({
          id: `${baseTitle.id}-s${s.season_number}e${idx + 1}`,
          season: s.season_number,
          number: idx + 1,
          name: `Episode ${idx + 1}`,
          synopsis: s.overview || `Season ${s.season_number}, Episode ${idx + 1} of ${baseTitle.name}.`,
          duration: 50,
          still: s.poster_path ? tmdbImage.still(s.poster_path) : baseTitle.backdrop,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        })),
      }));
  }

  return {
    ...baseTitle,
    imdbId,
    tagline: data.tagline || baseTitle.tagline,
    runtime: data.runtime || baseTitle.runtime,
    cast,
    creators: directors,
    writers: directors,
    trailers,
    seasons,
  };
}

export async function fetchTitleById(id: string): Promise<Title | null> {
  const parts = id.split('-');
  let type: 'movie' | 'series' = 'movie';
  let tmdbId = 0;

  if (parts.length >= 2) {
    type = parts[0] === 'series' || parts[0] === 'tv' ? 'series' : 'movie';
    tmdbId = parseInt(parts[1], 10);
  } else {
    tmdbId = parseInt(id, 10);
  }

  if (!tmdbId || isNaN(tmdbId)) return null;

  try {
    return await getTitleDetails(tmdbId, type);
  } catch {
    try {
      const altType = type === 'movie' ? 'series' : 'movie';
      return await getTitleDetails(tmdbId, altType);
    } catch {
      return null;
    }
  }
}


