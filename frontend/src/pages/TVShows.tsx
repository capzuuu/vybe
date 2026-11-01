import React, { useState, useEffect, useMemo } from 'react';
import { useCatalog } from '../contexts/CatalogContext';
import { HeroBanner } from '../components/HeroBanner';
import { MovieCarousel } from '../components/MovieCarousel';
import { TopTenCarousel } from '../components/TopTenCarousel';
import { MovieCard } from '../components/MovieCard';
import { GenreSelector } from '../components/ui/GenreSelector';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import {
  featured,
  trending,
  popular,
  topTen,
  newReleases,
  byGenre,
  allGenres,
  getDiscoverByGenre,
  GENRE_NAME_TO_ID,
} from '../services/catalogService';
import type { Title } from '../types';

export function TVShows() {
  const { titles, loading } = useCatalog();
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [viewMode, setViewMode] = useState<'rows' | 'grid'>('rows');
  const [genreTitles, setGenreTitles] = useState<Title[]>([]);
  const [loadingGenre, setLoadingGenre] = useState(false);

  const series = useMemo(() => titles.filter((t) => t.type === 'series'), [titles]);
  const genres = useMemo(() => allGenres(series, 'series'), [series]);

  useEffect(() => {
    if (selectedGenre !== 'All') {
      const gId = GENRE_NAME_TO_ID[selectedGenre];
      if (gId) {
        setLoadingGenre(true);
        getDiscoverByGenre(gId, 'tv')
          .then((res) => setGenreTitles(res))
          .catch(() => setGenreTitles(byGenre(series, selectedGenre)))
          .finally(() => setLoadingGenre(false));
      } else {
        setGenreTitles(byGenre(series, selectedGenre));
      }
    }
  }, [selectedGenre, series]);

  const featuredSeries = useMemo(() => featured(series, 'series', 3), [series]);
  const trendingSeries = useMemo(() => trending(series, 'series'), [series]);
  const top10Series = useMemo(() => topTen(series, 'series'), [series]);
  const popularSeries = useMemo(() => popular(series, 'series'), [series]);
  const newReleaseSeries = useMemo(() => newReleases(series, 'series'), [series]);
  const dramaSeries = useMemo(() => byGenre(series, 'Drama'), [series]);
  const comedySeries = useMemo(() => byGenre(series, 'Comedy'), [series]);
  const actionScifiSeries = useMemo(() => byGenre(series, 'Sci-Fi'), [series]);

  if (loading) {
    return (
      <div className="page page--padded">
        <LoadingSkeleton type="hero" />
        <LoadingSkeleton type="row" />
      </div>
    );
  }

  const filtered = selectedGenre === 'All' ? series : genreTitles;
  const showHero = viewMode === 'rows' && selectedGenre === 'All' && featuredSeries.length > 0;

  return (
    <div className="page">
      {/* Top spacer matching fixed navigation height */}
      <div className="category-header-spacer" />

      {/* Modern sticky category subheader */}
      <GenreSelector
        title="TV Shows"
        genres={genres}
        selectedGenre={selectedGenre}
        onSelectGenre={setSelectedGenre}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        hasHero={showHero}
      />

      {showHero ? (
        <>
          <div className="category-hero-wrapper">
            <HeroBanner titles={featuredSeries} />
          </div>

          <div style={{ marginTop: '-4vw', position: 'relative', zIndex: 3 }}>
            <MovieCarousel title="Trending Series" titles={trendingSeries} />
            <TopTenCarousel title="Top 10 TV Shows Today" titles={top10Series} />
            <MovieCarousel title="Popular Series" titles={popularSeries} />
            <MovieCarousel title="New Episodes" titles={newReleaseSeries} />
            <MovieCarousel title="Drama Series" titles={dramaSeries} />
            <MovieCarousel title="Comedy Series" titles={comedySeries} />
            <MovieCarousel title="Action & Sci-Fi" titles={actionScifiSeries} />
          </div>
        </>
      ) : (
        <div className="category-grid-content">
          {loadingGenre ? (
            <LoadingSkeleton type="grid" count={12} />
          ) : filtered.length === 0 ? (
            <div className="empty">
              <h2>No TV Shows found</h2>
              <p>There are no series in this genre right now.</p>
            </div>
          ) : (
            <div className="skeleton-grid">
              {filtered.map((item) => (
                <MovieCard key={item.id} title={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
