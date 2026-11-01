/**
 * TMDB (The Movie Database) image and API utilities.
 * Dedicated streaming powered by VidLink PRO.
 */

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

export const tmdbImage = {
  backdrop: (path: string, size: 'w780' | 'w1280' | 'original' = 'w780') =>
    path.startsWith('http') ? path : `${TMDB_IMAGE_BASE}${size}${path}`,
  backdropHero: (path: string) =>
    path.startsWith('http') ? path : `${TMDB_IMAGE_BASE}w1280${path}`,
  poster: (path: string, size: 'w342' | 'w500' | 'w780' = 'w342') =>
    path.startsWith('http') ? path : `${TMDB_IMAGE_BASE}${size}${path}`,
  still: (path: string, size: 'w300' | 'original' = 'w300') =>
    path.startsWith('http') ? path : `${TMDB_IMAGE_BASE}${size}${path}`,
};

export interface VidlinkOptions {
  autoplay?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  iconColor?: string;
  icons?: 'vid' | 'default';
  nextbutton?: boolean;
  startAt?: number;
}

/**
 * Builds the official VidLink PRO embed URL for movies and TV episodes.
 * Uses TMDB ID for direct, ad-free HD streaming matching Vybe's red brand palette.
 */
export function getVidlinkUrl(
  tmdbId: number,
  type: 'movie' | 'series',
  season = 1,
  episode = 1,
  options?: VidlinkOptions,
): string {
  const s = Math.max(1, season);
  const ep = Math.max(1, episode);
  const base =
    type === 'movie'
      ? `https://vidlink.pro/movie/${tmdbId}`
      : `https://vidlink.pro/tv/${tmdbId}/${s}/${ep}`;

  const params = new URLSearchParams({
    primaryColor: options?.primaryColor ?? 'e50914', // Vybe Red (#e50914)
    secondaryColor: options?.secondaryColor ?? '141414',
    iconColor: options?.iconColor ?? 'ffffff',
    icons: options?.icons ?? 'vid',
    autoplay: options?.autoplay !== false ? 'true' : 'false',
    nextbutton: options?.nextbutton !== false ? 'true' : 'false',
  });

  if (options?.startAt && options.startAt > 0) {
    params.set('startAt', Math.round(options.startAt).toString());
  }

  return `${base}?${params.toString()}`;
}

/** Alias for compatibility */
export const getVidsrcUrl = (
  tmdbId: number,
  type: 'movie' | 'series',
  season = 1,
  episode = 1,
): string => getVidlinkUrl(tmdbId, type, season, episode);
