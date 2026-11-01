export type TitleType = 'movie' | 'series';

export type Maturity = 'ALL' | '7+' | '13+' | '16+' | '18+';

export type TitleFont =
  | 'bebas'
  | 'anton'
  | 'playfair'
  | 'cinzel'
  | 'righteous'
  | 'marker'
  | 'orbitron'
  | 'inter';

export interface Episode {
  id: string;
  season: number;
  number: number;
  name: string;
  synopsis: string;
  /** Runtime in minutes */
  duration: number;
  still: string;
  videoUrl: string;
}

export interface Season {
  number: number;
  episodes: Episode[];
}

export interface Trailer {
  id: string;
  name: string;
  kind: 'Trailer' | 'Teaser' | 'Clip' | 'Behind the Scenes';
  thumbnail: string;
  videoUrl: string;
  /** Runtime in seconds */
  duration: number;
}

export interface Title {
  id: string;
  tmdbId?: number;
  imdbId?: string;
  type: TitleType;
  name: string;
  tagline: string;
  synopsis: string;
  year: number;
  maturity: Maturity;
  maturityReasons: string[];
  /** Movie runtime in minutes */
  runtime?: number;
  seasons?: Season[];
  genres: string[];
  moods: string[];
  cast: string[];
  creators: string[];
  writers: string[];
  language: string;
  audio: string[];
  subtitles: string[];
  match: number;
  rating: number;
  popularity: number;
  trend: number;
  quality: 'HD' | '4K';
  backdrop: string;
  poster: string;
  videoUrl: string;
  trailerStart: number;
  trailers: Trailer[];
  original: boolean;
  featured: boolean;
  recentlyAdded: boolean;
  newEpisodes: boolean;
  addedAt: string;
  font: TitleFont;
  accent: string;
}

export interface Profile {
  id: string;
  name: string;
  avatar: number;
  kids: boolean;
}

export interface ProgressEntry {
  titleId: string;
  episodeId?: string;
  /** Seconds */
  position: number;
  /** Seconds */
  duration: number;
  updatedAt: number;
}

export interface ProfileData {
  myList: string[];
  likes: string[];
  progress: ProgressEntry[];
  readNotifications: string[];
}

export interface Item {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  created_at: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}


