import React, { useState, useEffect, useMemo } from 'react';
import { useCatalog } from '../contexts/CatalogContext';
import { useLibrary } from '../contexts/ProfileContext';
import { HeroBanner } from '../components/HeroBanner';
import { MovieCarousel } from '../components/MovieCarousel';
import { TopTenCarousel } from '../components/TopTenCarousel';
import { getTodayHoliday, byHoliday, fetchLiveHolidayTitles } from '../services/holidayService';
import type { Title } from '../types';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { MoodBar, type MoodType, filterTitlesByMood, MOODS } from '../components/MoodBar';
import {
  featured,
  trending,
  popular,
  topTen,
  newReleases,
  byGenre,
  recommended,
  sortBy,
} from '../services/catalogService';

export function Home() {
  const { titles, loading, registerTitles, getTitle } = useCatalog();
  const { progress, myList, likes } = useLibrary();
  const [selectedMood, setSelectedMood] = useState<MoodType>('all');
  const [liveHolidayTitles, setLiveHolidayTitles] = useState<Title[]>([]);

  // Dynamic holiday detection and matching (e.g. Halloween, Christmas, etc.)
  const currentHoliday = useMemo(() => getTodayHoliday(), []);

  useEffect(() => {
    if (!currentHoliday) return;
    let active = true;
    fetchLiveHolidayTitles(currentHoliday).then((fetched) => {
      if (!active || !fetched.length) return;
      registerTitles(fetched);
      setLiveHolidayTitles(fetched);
    });
    return () => {
      active = false;
    };
  }, [currentHoliday, registerTitles]);

  if (loading) {
    return (
      <div className="page">
        <LoadingSkeleton type="hero" />
        <LoadingSkeleton type="row" />
        <LoadingSkeleton type="row" />
      </div>
    );
  }

  // Mood filtering (memoized)
  const moodTitles = useMemo(() => filterTitlesByMood(titles, selectedMood), [titles, selectedMood]);
  const activeMoodConfig = useMemo(() => MOODS.find((m) => m.id === selectedMood), [selectedMood]);

  // Filtered mood sets (memoized)
  const moodTopPicks = useMemo(() => [...moodTitles].sort(sortBy.rating).slice(0, 18), [moodTitles]);
  const moodTrending = useMemo(() => [...moodTitles].sort(sortBy.trend).slice(0, 18), [moodTitles]);
  const moodNewest = useMemo(() => [...moodTitles].sort(sortBy.newest).slice(0, 18), [moodTitles]);
  const moodMovies = useMemo(() => moodTitles.filter((t) => t.type === 'movie').slice(0, 18), [moodTitles]);
  const moodSeries = useMemo(() => moodTitles.filter((t) => t.type === 'series').slice(0, 18), [moodTitles]);

  // Standard Default Catalog (memoized)
  const featuredTitles = useMemo(() => featured(titles, undefined, 5), [titles]);
  const trendingTitles = useMemo(() => trending(titles), [titles]);
  const popularTitles = useMemo(() => popular(titles), [titles]);
  const top10Titles = useMemo(() => topTen(titles), [titles]);
  const newReleaseTitles = useMemo(() => newReleases(titles), [titles]);
  const actionTitles = useMemo(() => byGenre(titles, 'Action'), [titles]);
  const comedyTitles = useMemo(() => byGenre(titles, 'Comedy'), [titles]);
  const animeTitles = useMemo(() => byGenre(titles, 'Anime'), [titles]);
  const docTitles = useMemo(() => byGenre(titles, 'Documentary'), [titles]);

  // Holiday titles: merge live fetched holiday titles with local catalog matches (memoized)
  const holidayTitles = useMemo(() => {
    if (!currentHoliday) return [];
    const catalogHolidayTitles = byHoliday(titles, currentHoliday);
    if (liveHolidayTitles.length > 0) {
      const seen = new Set<string>();
      const combined: Title[] = [];
      for (const t of [...liveHolidayTitles, ...catalogHolidayTitles]) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          combined.push(t);
        }
      }
      return combined.slice(0, 18);
    }
    return catalogHolidayTitles;
  }, [currentHoliday, titles, liveHolidayTitles]);

  // Continue watching titles (memoized with strict id de-duplication)
  const continueWatchingTitles = useMemo(() => {
    const seen = new Set<string>();
    const list: typeof titles = [];
    for (const p of progress) {
      if (p?.titleId && !seen.has(p.titleId)) {
        seen.add(p.titleId);
        const item = getTitle(p.titleId) || titles.find((t) => t.id === p.titleId);
        if (item) list.push(item);
      }
    }
    return list;
  }, [progress, titles, getTitle]);

  // Personalization (memoized)
  const preferred = useMemo(() => {
    const listSet = new Set(myList);
    const likeSet = new Set(likes);
    return titles.filter((t) => listSet.has(t.id) || likeSet.has(t.id));
  }, [titles, myList, likes]);

  const recommendedTitles = useMemo(() => {
    return recommended(titles, preferred);
  }, [titles, preferred]);

  // My List (memoized with strict id de-duplication)
  const myListTitles = useMemo(() => {
    const seen = new Set<string>();
    const list: typeof titles = [];
    for (const id of myList) {
      if (id && !seen.has(id)) {
        seen.add(id);
        const item = getTitle(id) || titles.find((t) => t.id === id);
        if (item) list.push(item);
      }
    }
    return list;
  }, [myList, titles, getTitle]);

  // "Because You Liked" recommendation
  const seedTitle = preferred[0];

  return (
    <div className="page">
      <HeroBanner titles={featuredTitles} />

      <div style={{ marginTop: '-4vw', position: 'relative', zIndex: 3 }}>
        {/* The Vybe Mood Switcher */}
        <MoodBar
          selectedMood={selectedMood}
          onSelectMood={setSelectedMood}
          filteredCount={selectedMood !== 'all' ? moodTitles.length : undefined}
        />

        {selectedMood === 'all' ? (
          <>
            {/* Continue Watching */}
            {continueWatchingTitles.length > 0 && (
              <MovieCarousel
                title="Continue Watching"
                titles={continueWatchingTitles}
                isContinueWatching
              />
            )}

            {/* Trending Now */}
            <MovieCarousel title="Trending Now" titles={trendingTitles} />

            {/* Top 10 Today */}
            <TopTenCarousel title="Top 10 Today" titles={top10Titles} />

            {/* Dynamic Holiday Row - e.g. "Because it's Halloween" - hidden if no holiday today */}
            {currentHoliday && holidayTitles.length > 0 && (
              <MovieCarousel
                title={`Because it's ${currentHoliday.name}`}
                titles={holidayTitles}
              />
            )}

            {/* Recommended For You */}
            {recommendedTitles.length > 0 && (
              <MovieCarousel title="Recommended for You" titles={recommendedTitles} />
            )}

            {/* Popular on Vybe */}
            <MovieCarousel title="Popular on Vybe" titles={popularTitles} />

            {/* Because You Watched */}
            {seedTitle && (
              <MovieCarousel
                title={`Because you watched ${seedTitle.name}`}
                titles={titles.filter(
                  (t) =>
                    t.id !== seedTitle.id &&
                    t.genres.some((g: string) => seedTitle.genres.includes(g))
                )}
              />
            )}

            {/* My List */}
            {myListTitles.length > 0 && (
              <MovieCarousel title="My List" titles={myListTitles} />
            )}

            {/* New Releases */}
            <MovieCarousel title="New Releases" titles={newReleaseTitles} />

            {/* Genre Rows */}
            <MovieCarousel title="Action & Adventure" titles={actionTitles} />
            <MovieCarousel title="Comedies" titles={comedyTitles} />
            <MovieCarousel title="Anime Series" titles={animeTitles} isPoster />
            <MovieCarousel title="Documentaries" titles={docTitles} />
          </>
        ) : (
          <div style={{ animation: 'fade-in 300ms var(--ease) both' }}>
            {moodTitles.length === 0 ? (
              <div className="empty">
                <h2>No titles found for this vybe</h2>
                <p>Try selecting another mood or reset to all vybes.</p>
                <button
                  type="button"
                  className="btn btn--red"
                  onClick={() => setSelectedMood('all')}
                  style={{ marginTop: '1rem' }}
                >
                  Reset to All Vybes
                </button>
              </div>
            ) : (
              <>
                <MovieCarousel
                  title={`Top ${activeMoodConfig?.name} Picks`}
                  titles={moodTopPicks}
                />
                <MovieCarousel
                  title={`Trending in ${activeMoodConfig?.name}`}
                  titles={moodTrending}
                />
                {moodMovies.length > 0 && (
                  <MovieCarousel
                    title={`${activeMoodConfig?.name} Movies`}
                    titles={moodMovies}
                  />
                )}
                {moodSeries.length > 0 && (
                  <MovieCarousel
                    title={`${activeMoodConfig?.name} Series & Shows`}
                    titles={moodSeries}
                  />
                )}
                <MovieCarousel
                  title={`New & Fresh in ${activeMoodConfig?.name}`}
                  titles={moodNewest}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
