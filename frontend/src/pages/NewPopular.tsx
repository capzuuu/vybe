import React, { useMemo } from 'react';
import { useCatalog } from '../contexts/CatalogContext';
import { MovieCarousel } from '../components/MovieCarousel';
import { TopTenCarousel } from '../components/TopTenCarousel';
import { MovieCard } from '../components/MovieCard';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { topTen, newReleases, sortBy } from '../services/catalogService';
import { relativeDate } from '../utils/format';
import { Bell, Flame, Calendar } from 'lucide-react';
import './newpopular.css';

export function NewPopular() {
  const { titles, loading } = useCatalog();

  const newTitles = useMemo(() => newReleases(titles).slice(0, 10), [titles]);
  const top10 = useMemo(() => topTen(titles), [titles]);
  const trendingTitles = useMemo(() => [...titles].sort(sortBy.trend).slice(0, 10), [titles]);

  if (loading) {
    return (
      <div className="page page--padded">
        <LoadingSkeleton type="hero" />
        <LoadingSkeleton type="row" />
      </div>
    );
  }

  return (
    <div className="page page--padded new-popular-page">
      <div className="new-popular-tabs">
        <h1 className="page__title">New & Popular</h1>
      </div>

      {/* Top 10 Overall Carousel */}
      <TopTenCarousel title="Top 10 Today" titles={top10} />

      {/* Trending Now */}
      <MovieCarousel title="Trending Now" titles={trendingTitles} />

      {/* Timeline Style "New on Vybe" Section */}
      <section className="new-timeline-section">
        <h2 className="new-section-title">
          <Flame size={22} color="#e50914" />
          <span>New on Vybe</span>
        </h2>

        <div className="new-timeline-list">
          {newTitles.map((item) => (
            <div key={item.id} className="new-timeline-item">
              <div className="new-timeline-date">
                <span className="date-badge">{relativeDate(item.addedAt)}</span>
              </div>

              <div className="new-timeline-card-wrapper">
                <MovieCard title={item} />
                <div className="new-timeline-details">
                  <div className="new-timeline-tagline">{item.tagline}</div>
                  <p className="new-timeline-synopsis">{item.synopsis}</p>
                  <div className="new-timeline-genres dot-list">
                    {item.genres.map((g: string) => (
                      <span key={g}>{g}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

