import React, { useState, useEffect, useMemo } from 'react';
import { useCatalog } from '../contexts/CatalogContext';
import { HeroBanner } from '../components/HeroBanner';
import { MovieCarousel } from '../components/MovieCarousel';
import { TopTenCarousel } from '../components/TopTenCarousel';
import { MovieCard } from '../components/MovieCard';
import { GenreSelector } from '../components/ui/GenreSelector';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import {
  getPopularKDramas,
  getTopRatedKDramas,
  getRomanceKDramas,
  getThrillerKDramas,
  getKoreanMovies,
  featured,
  sortBy,
} from '../services/catalogService';
import type { Title } from '../types';

const KDRAMA_CATEGORIES = ['All', 'Romance', 'Thriller & Crime', 'Korean Movies', 'Top Rated'];

export function KDrama() {
  const { registerTitles } = useCatalog();
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [viewMode, setViewMode] = useState<'rows' | 'grid'>('rows');
  const [loading, setLoading] = useState(true);

  // Category streams
  const [popularDramas, setPopularDramas] = useState<Title[]>([]);
  const [topRatedDramas, setTopRatedDramas] = useState<Title[]>([]);
  const [romanceDramas, setRomanceDramas] = useState<Title[]>([]);
  const [thrillerDramas, setThrillerDramas] = useState<Title[]>([]);
  const [koreanMovies, setKoreanMovies] = useState<Title[]>([]);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      getPopularKDramas(),
      getTopRatedKDramas(),
      getRomanceKDramas(),
      getThrillerKDramas(),
      getKoreanMovies(),
    ])
      .then(([popRes, topRes, romRes, thrRes, movRes]) => {
        if (!active) return;
        const pop = popRes.status === 'fulfilled' ? popRes.value : [];
        const top = topRes.status === 'fulfilled' ? topRes.value : [];
        const rom = romRes.status === 'fulfilled' ? romRes.value : [];
        const thr = thrRes.status === 'fulfilled' ? thrRes.value : [];
        const mov = movRes.status === 'fulfilled' ? movRes.value : [];

        setPopularDramas(pop);
        setTopRatedDramas(top);
        setRomanceDramas(rom);
        setThrillerDramas(thr);
        setKoreanMovies(mov);

        // Register all in global catalog context so player & modals can immediately load them
        const allFetched = [...pop, ...top, ...rom, ...thr, ...mov];
        if (allFetched.length > 0) {
          registerTitles(allFetched);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [registerTitles]);

  // Memoized lists (Hooks must be called unconditionally on EVERY render)
  const allKDramas = useMemo(() => {
    const seen = new Set<string>();
    const list: Title[] = [];
    for (const t of [...popularDramas, ...romanceDramas, ...thrillerDramas, ...topRatedDramas, ...koreanMovies]) {
      if (t?.id && !seen.has(t.id)) {
        seen.add(t.id);
        list.push(t);
      }
    }
    return list;
  }, [popularDramas, romanceDramas, thrillerDramas, topRatedDramas, koreanMovies]);

  const featuredDramas = useMemo(() => featured(popularDramas, 'series', 3), [popularDramas]);
  const trendingDramas = useMemo(() => [...popularDramas].sort(sortBy.trend).slice(0, 18), [popularDramas]);
  const top10Dramas = useMemo(() => topRatedDramas.slice(0, 10), [topRatedDramas]);
  const romanticRows = useMemo(() => romanceDramas.slice(0, 18), [romanceDramas]);
  const thrillerRows = useMemo(() => thrillerDramas.slice(0, 18), [thrillerDramas]);
  const movieRows = useMemo(() => koreanMovies.slice(0, 18), [koreanMovies]);

  const filteredTitles = useMemo(() => {
    if (selectedGenre === 'Romance') return romanceDramas;
    if (selectedGenre === 'Thriller & Crime') return thrillerDramas;
    if (selectedGenre === 'Korean Movies') return koreanMovies;
    if (selectedGenre === 'Top Rated') return topRatedDramas;
    return allKDramas;
  }, [selectedGenre, romanceDramas, thrillerDramas, koreanMovies, topRatedDramas, allKDramas]);

  if (loading) {
    return (
      <div className="page page--padded">
        <LoadingSkeleton type="hero" />
        <LoadingSkeleton type="row" />
      </div>
    );
  }

  const showHero = viewMode === 'rows' && selectedGenre === 'All' && featuredDramas.length > 0;

  return (
    <div className="page">
      {/* Top spacer matching fixed navigation height */}
      <div className="category-header-spacer" />

      {/* Modern sticky category subheader */}
      <GenreSelector
        title="K-Drama"
        genres={KDRAMA_CATEGORIES}
        selectedGenre={selectedGenre}
        onSelectGenre={setSelectedGenre}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        hasHero={showHero}
      />

      {showHero ? (
        <>
          <div className="category-hero-wrapper">
            <HeroBanner titles={featuredDramas} />
          </div>

          <div style={{ marginTop: '-4vw', position: 'relative', zIndex: 3 }}>
            <MovieCarousel title="Trending K-Dramas" titles={trendingDramas} />
            <TopTenCarousel title="Top 10 K-Dramas Today" titles={top10Dramas} />
            <MovieCarousel title="Heart-Fluttering Romance" titles={romanticRows} />
            <MovieCarousel title="Thrilling & Suspenseful Dramas" titles={thrillerRows} />
            <MovieCarousel title="Acclaimed Korean Cinema" titles={movieRows} />
            <MovieCarousel title="Fan-Favorite Masterpieces" titles={popularDramas.slice(5, 23)} />
          </div>
        </>
      ) : (
        <div className="category-grid-content">
          {filteredTitles.length === 0 ? (
            <div className="empty">
              <h2>No Korean Titles found</h2>
              <p>There are no titles available in this category right now.</p>
            </div>
          ) : (
            <div className="skeleton-grid">
              {filteredTitles.map((item) => (
                <MovieCard key={item.id} title={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

