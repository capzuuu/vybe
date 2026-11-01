import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../contexts/CatalogContext';
import { useLibrary } from '../contexts/ProfileContext';
import { MovieCard } from '../components/MovieCard';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { Bookmark, Sparkles } from 'lucide-react';

export function MyList() {
  const { titles, loading, getTitle } = useCatalog();
  const { myList } = useLibrary();
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'series'>('all');
  const [sortOrder, setSortOrder] = useState<'added' | 'az' | 'rating'>('added');

  if (loading) {
    return (
      <div className="page page--padded">
        <LoadingSkeleton type="grid" count={12} />
      </div>
    );
  }

  // Resolve titles in myList (de-duplicated)
  const savedTitles = useMemo(() => {
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

  // Filter
  const filtered = savedTitles.filter((t) => {
    if (filterType === 'movie') return t.type === 'movie';
    if (filterType === 'series') return t.type === 'series';
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'az') return a.name.localeCompare(b.name);
    if (sortOrder === 'rating') return b.rating - a.rating;
    return 0; // Default: order preserved in myList (recently added first)
  });

  return (
    <div className="page page--padded">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <h1 className="page__title" style={{ margin: 0 }}>My List</h1>

        {savedTitles.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              className="select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              aria-label="Filter by type"
            >
              <option value="all">All Titles</option>
              <option value="movie">Movies</option>
              <option value="series">TV Shows</option>
            </select>

            <select
              className="select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              aria-label="Sort order"
            >
              <option value="added">Recently Added</option>
              <option value="az">Alphabetical (A-Z)</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          <div className="empty__icon">
            <Bookmark size={40} />
          </div>
          <h2>You haven't added any titles to your list yet</h2>
          <p>
            Explore movies and TV shows, then click the <strong>+</strong> button on any title to save it for later.
          </p>
          <Link to="/" className="btn btn--play" style={{ marginTop: '1rem' }}>
            <span>Browse Popular Titles</span>
          </Link>
        </div>
      ) : (
        <div className="skeleton-grid">
          {sorted.map((item) => (
            <MovieCard key={item.id} title={item} />
          ))}
        </div>
      )}
    </div>
  );
}

