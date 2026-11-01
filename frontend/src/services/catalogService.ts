import type { Title, TitleType } from '../types';
import {
  getTrendingAll,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTopRatedTV,
  getNowPlayingMovies,
  getDiscoverByGenre,
  searchTMDB,
  getTitleDetails,
  GENRE_NAME_TO_ID,
} from './tmdbService';

/**
 * Loads a rich dynamic catalog fetched directly from TMDB API endpoints.
 */
export async function fetchCatalog(): Promise<Title[]> {
  try {
    const [trending, popMovies, popTV, nowPlaying, topMovies] = await Promise.all([
      getTrendingAll(),
      getPopularMovies(),
      getPopularTV(),
      getNowPlayingMovies(),
      getTopRatedMovies(),
    ]);

    // De-duplicate by id
    const map = new Map<string, Title>();
    [...trending, ...popMovies, ...popTV, ...nowPlaying, ...topMovies].forEach((item, idx) => {
      if (!map.has(item.id)) {
        // Tag top 5 as featured
        if (idx < 5) item.featured = true;
        map.set(item.id, item);
      }
    });

    return Array.from(map.values());
  } catch (err) {
    console.warn('Failed to load TMDB live catalog, attempting fallback:', err);
    // Return trending if available or empty list
    return getTrendingAll().catch(() => []);
  }
}

// ── Selectors ───────────────────────────────────────────────────────

const byType = (titles: Title[], type?: TitleType) =>
  type ? titles.filter((t) => t.type === type) : titles;

export const sortBy = {
  popularity: (a: Title, b: Title) => b.popularity - a.popularity,
  trend: (a: Title, b: Title) => b.trend - a.trend,
  rating: (a: Title, b: Title) => b.rating - a.rating,
  newest: (a: Title, b: Title) => +new Date(b.addedAt) - +new Date(a.addedAt),
  year: (a: Title, b: Title) => b.year - a.year || b.popularity - a.popularity,
  match: (a: Title, b: Title) => b.match - a.match,
  az: (a: Title, b: Title) => a.name.localeCompare(b.name),
  za: (a: Title, b: Title) => b.name.localeCompare(a.name),
};

export function featured(titles: Title[], type?: TitleType, count = 5): Title[] {
  const pool = byType(titles, type);
  const picks = pool.filter((t) => t.featured).sort(sortBy.popularity);
  const rest = pool.filter((t) => !t.featured).sort(sortBy.popularity);
  return [...picks, ...rest].slice(0, count);
}

export const trending = (titles: Title[], type?: TitleType) =>
  byType(titles, type).sort(sortBy.trend).slice(0, 18);

export const popular = (titles: Title[], type?: TitleType) =>
  byType(titles, type).sort(sortBy.popularity).slice(0, 18);

export const topTen = (titles: Title[], type?: TitleType) =>
  byType(titles, type).sort(sortBy.rating).slice(0, 10);

export const newReleases = (titles: Title[], type?: TitleType) =>
  byType(titles, type).sort(sortBy.newest).slice(0, 18);

export const byGenre = (titles: Title[], genre: string) =>
  titles.filter((t) => t.genres.some((g: string) => g.toLowerCase() === genre.toLowerCase())).sort(sortBy.popularity);

/** Personalised ranking: match score boosted by genres the profile has liked or saved. */
export function recommended(titles: Title[], preferred: Title[], type?: TitleType): Title[] {
  const weights = new Map<string, number>();
  preferred.forEach((t) => t.genres.forEach((g: string) => weights.set(g, (weights.get(g) ?? 0) + 1)));
  const seen = new Set(preferred.map((t) => t.id));
  const score = (t: Title) => t.match + t.genres.reduce((s: number, g: string) => s + (weights.get(g) ?? 0) * 4, 0);
  return byType(titles, type)
    .filter((t) => !seen.has(t.id))
    .sort((a, b) => score(b) - score(a))
    .slice(0, 18);
}

export function similar(titles: Title[], title: Title, count = 12): Title[] {
  const overlap = (t: Title) =>
    t.genres.filter((g: string) => title.genres.includes(g)).length * 3 +
    (t.type === title.type ? 1 : 0);
  return titles
    .filter((t) => t.id !== title.id)
    .map((t) => ({ t, s: overlap(t) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s || b.t.match - a.t.match)
    .slice(0, count)
    .map(({ t }) => t);
}

export function allGenres(titles: Title[], type?: TitleType): string[] {
  return [
    'Action',
    'Adventure',
    'Animation',
    'Comedy',
    'Crime',
    'Documentary',
    'Drama',
    'Family',
    'Fantasy',
    'Horror',
    'Mystery',
    'Romance',
    'Sci-Fi',
    'Thriller',
  ];
}

export function allLanguages(titles: Title[], field: 'language' | 'audio' | 'subtitles' = 'language'): string[] {
  const values = titles.flatMap((t) => (field === 'language' ? [t.language] : t[field]));
  return [...new Set(values)].filter(Boolean).sort();
}

// ── Live TMDB Search ────────────────────────────────────────────────

export interface SearchResult {
  results: Title[];
  suggestions: string[];
}

export async function searchTitlesLive(query: string, existingTitles: Title[]): Promise<SearchResult> {
  const q = query.trim().toLowerCase();
  if (!q) return { results: [], suggestions: [] };

  try {
    const liveResults = await searchTMDB(q);
    const suggestions = [
      ...new Set(liveResults.flatMap((t) => t.genres)),
    ].slice(0, 6);

    return {
      results: liveResults,
      suggestions,
    };
  } catch {
    // Local filter fallback
    const matched = existingTitles.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.genres.some((g: string) => g.toLowerCase().includes(q)),
    );
    return {
      results: matched,
      suggestions: [],
    };
  }
}

export { getTitleDetails, getDiscoverByGenre, GENRE_NAME_TO_ID };
