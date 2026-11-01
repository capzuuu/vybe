import type { Title } from '../types';
import { sortBy } from './catalogService';
import { getDiscoverByGenre, searchTMDB } from './tmdbService';

export interface HolidayInfo {
  id: string;
  name: string; // e.g. "Halloween", "Christmas", "Valentine's Day"
  genres: string[];
  searchQuery?: string;
  keywords?: string[];
}

/**
 * Identifies if today matches any calendar holiday or holiday window.
 * Returns the holiday metadata, or null if today has no holiday.
 */
export function getTodayHoliday(date: Date = new Date()): HolidayInfo | null {
  const month = date.getMonth(); // 0-indexed: Jan=0, Feb=1, ..., Oct=9, Nov=10, Dec=11
  const day = date.getDate();

  // 🎃 Halloween (Oct 24 - Nov 1, specifically Oct 31)
  // Shows Halloween movies or series that are horror
  if ((month === 9 && day >= 24) || (month === 10 && day === 1)) {
    return {
      id: 'halloween',
      name: 'Halloween',
      genres: ['Horror'],
      searchQuery: 'Halloween',
      keywords: ['halloween', 'horror', 'spooky', 'slasher', 'witch', 'creepy'],
    };
  }

  // 🎄 Christmas (Dec 1 - Dec 26, specifically Dec 25)
  // Shows Christmas movies or series
  if (month === 11 && day >= 1 && day <= 26) {
    return {
      id: 'christmas',
      name: 'Christmas',
      genres: ['Family', 'Comedy'],
      searchQuery: 'Christmas',
      keywords: [
        'christmas',
        'xmas',
        'santa',
        'claus',
        'grinch',
        'holiday',
        'noel',
        'elf',
        'carol',
        'snowman',
        'reindeer',
        'nutcracker',
      ],
    };
  }

  // 🎆 New Year's (Dec 31 - Jan 2)
  if ((month === 11 && day === 31) || (month === 0 && day <= 2)) {
    return {
      id: 'newyear',
      name: "New Year's",
      genres: ['Action', 'Comedy'],
      searchQuery: 'New Year',
      keywords: ['new year', 'party', 'celebration'],
    };
  }

  // 💘 Valentine's Day (Feb 10 - Feb 15)
  if (month === 1 && day >= 10 && day <= 15) {
    return {
      id: 'valentines',
      name: "Valentine's Day",
      genres: ['Romance'],
      searchQuery: 'Valentine Romance',
      keywords: ['valentine', 'romance', 'love story'],
    };
  }

  // ☘️ St. Patrick's Day (March 15 - March 18)
  if (month === 2 && day >= 15 && day <= 18) {
    return {
      id: 'stpatricks',
      name: "St. Patrick's Day",
      genres: ['Fantasy', 'Comedy'],
      searchQuery: 'St Patrick',
      keywords: ['patrick', 'irish', 'luck'],
    };
  }

  // 🦃 Thanksgiving (Nov 21 - Nov 28)
  if (month === 10 && day >= 21 && day <= 28) {
    return {
      id: 'thanksgiving',
      name: 'Thanksgiving',
      genres: ['Family', 'Comedy'],
      searchQuery: 'Thanksgiving',
      keywords: ['thanksgiving', 'turkey', 'family feast'],
    };
  }

  // 🎆 4th of July (July 2 - July 5)
  if (month === 6 && day >= 2 && day <= 5) {
    return {
      id: 'fourthofjuly',
      name: 'the 4th of July',
      genres: ['Action', 'History'],
      searchQuery: 'Independence',
      keywords: ['independence', 'fourth of july', '4th of july'],
    };
  }

  // No holiday today -> return null so row is completely hidden
  return null;
}

/**
 * Synchronous filter over catalog titles based on holiday criteria:
 * - Halloween: horror movies or series, or titles containing Halloween
 * - Christmas: Christmas-themed movies or series
 * - Other holidays: matching holiday genres / keywords
 */
export function byHoliday(titles: Title[], holiday: HolidayInfo | null): Title[] {
  if (!holiday) return [];

  // Halloween: show horror movies and series
  if (holiday.id === 'halloween') {
    return titles
      .filter((t) => {
        const isHorror = t.genres.some((g) => g.toLowerCase() === 'horror');
        const isHalloween =
          t.name.toLowerCase().includes('halloween') ||
          t.synopsis.toLowerCase().includes('halloween');
        return isHorror || isHalloween;
      })
      .sort(sortBy.popularity)
      .slice(0, 18);
  }

  // Christmas: show Christmas movies and series
  if (holiday.id === 'christmas') {
    const xmasWords = holiday.keywords || [
      'christmas',
      'xmas',
      'santa',
      'claus',
      'grinch',
      'elf',
      'noel',
      'carol',
      'holiday',
    ];
    return titles
      .filter((t) => {
        const nameLower = t.name.toLowerCase();
        const synLower = t.synopsis.toLowerCase();
        return xmasWords.some((w) => nameLower.includes(w) || synLower.includes(w));
      })
      .sort(sortBy.popularity)
      .slice(0, 18);
  }

  // Other holidays: match configured genres or keywords
  if (holiday.genres && holiday.genres.length > 0) {
    const targetGenres = holiday.genres.map((g) => g.toLowerCase());
    return titles
      .filter((t) => {
        const titleGenres = (t.genres || []).map((g) => g.toLowerCase());
        const genreMatch = titleGenres.some((g) =>
          targetGenres.some((tg) => g === tg || g.includes(tg))
        );
        if (holiday.keywords?.length) {
          const nameLower = t.name.toLowerCase();
          const synLower = t.synopsis.toLowerCase();
          const keywordMatch = holiday.keywords.some(
            (k) => nameLower.includes(k) || synLower.includes(k)
          );
          return genreMatch || keywordMatch;
        }
        return genreMatch;
      })
      .sort(sortBy.popularity)
      .slice(0, 18);
  }

  return [];
}

/**
 * Fetches dedicated live holiday movies and TV series from TMDB.
 * For Halloween: fetches Horror movies, Horror series, and Halloween titles.
 * For Christmas: fetches Christmas movies and series.
 */
export async function fetchLiveHolidayTitles(holiday: HolidayInfo): Promise<Title[]> {
  try {
    if (holiday.id === 'halloween') {
      const [horrorMovies, halloweenSearch, horrorSearch] = await Promise.all([
        // TMDB genre 27 is Horror
        getDiscoverByGenre(27, 'movie').catch(() => []),
        searchTMDB('Halloween').catch(() => []),
        searchTMDB('Horror').catch(() => []),
      ]);

      const combined = [...horrorMovies, ...halloweenSearch, ...horrorSearch];
      const seen = new Set<string>();
      const results: Title[] = [];

      for (const t of combined) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          const hasHorrorGenre = t.genres.some((g) => g.toLowerCase().includes('horror'));
          const isHalloweenName =
            t.name.toLowerCase().includes('halloween') ||
            t.synopsis.toLowerCase().includes('halloween') ||
            t.synopsis.toLowerCase().includes('horror');

          // Strictly horror movies or series, or Halloween titles
          if (hasHorrorGenre || isHalloweenName) {
            results.push(t);
          }
        }
      }

      return results.sort(sortBy.popularity).slice(0, 20);
    }

    if (holiday.id === 'christmas') {
      const [xmasSearch, santaSearch, holidaySearch] = await Promise.all([
        searchTMDB('Christmas').catch(() => []),
        searchTMDB('Santa Claus').catch(() => []),
        searchTMDB('Holiday').catch(() => []),
      ]);

      const combined = [...xmasSearch, ...santaSearch, ...holidaySearch];
      const seen = new Set<string>();
      const results: Title[] = [];
      const xmasWords = holiday.keywords || [
        'christmas',
        'xmas',
        'santa',
        'claus',
        'grinch',
        'holiday',
        'noel',
        'elf',
        'carol',
      ];

      for (const t of combined) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          const nameLower = t.name.toLowerCase();
          const synLower = t.synopsis.toLowerCase();
          const isXmasThemed = xmasWords.some((w) => nameLower.includes(w) || synLower.includes(w));
          if (isXmasThemed) {
            results.push(t);
          }
        }
      }

      return results.sort(sortBy.popularity).slice(0, 20);
    }

    if (holiday.searchQuery) {
      const searchResults = await searchTMDB(holiday.searchQuery).catch(() => []);
      return searchResults.slice(0, 20);
    }
  } catch (err) {
    console.warn('Failed to fetch live holiday titles:', err);
  }

  return [];
}
