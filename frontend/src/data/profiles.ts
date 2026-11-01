import type { Profile } from '../types';

/** Avatar palette – each entry is a background + face colour pair. */
export const AVATARS: { bg: string; fg: string; face: 'smile' | 'grin' | 'wink' | 'cool' }[] = [
  { bg: '#e50914', fg: '#ffffff', face: 'smile' },
  { bg: '#0071eb', fg: '#ffffff', face: 'grin' },
  { bg: '#f5c518', fg: '#141414', face: 'wink' },
  { bg: '#46d369', fg: '#141414', face: 'cool' },
  { bg: '#9b51e0', fg: '#ffffff', face: 'smile' },
  { bg: '#ff7a1a', fg: '#141414', face: 'grin' },
  { bg: '#00b5ad', fg: '#ffffff', face: 'wink' },
  { bg: '#e0457b', fg: '#ffffff', face: 'cool' },
];

/** Default starting profile for new accounts: exactly 1 profile named Alex */
export const DEFAULT_PROFILES: Profile[] = [
  { id: 'p-alex', name: 'Alex', avatar: 0, kids: false },
];

export const MAX_PROFILES = 5;
