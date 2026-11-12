import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalog } from '../contexts/CatalogContext';
import { useDebounce } from '../hooks';
import { searchTitlesLive, type SearchResult } from '../services/catalogService';
import { MovieCard } from '../components/MovieCard';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { Search } from 'lucide-react';
import type { Title } from '../types';

// Bounded in-memory instant search cache (LRU cap prevents heap growth)
const searchCache = new Map<string, SearchResult>();
const MAX_SEARCH_CACHE_ENTRIES = 60;

function setSearchCacheEntry(key: string, value: SearchResult): void {
  if (searchCache.has(key)) searchCache.delete(key);
  searchCache.set(key, value);
  while (searchCache.size > MAX_SEARCH_CACHE_ENTRIES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey === undefined) break;
    searchCache.delete(oldestKey);
  }
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { titles, registerTitles } = useCatalog();

  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebounce(query.trim(), 250);

  const [results, setResults] = useState<Title[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  const titlesRef = useRef(titles);
  titlesRef.current = titles;

  useEffect(() => {
    let cancelled = false;
    const q = debouncedQuery.toLowerCase();

    if (!q) {
      setResults([]);
      setSuggestions([]);
      setSearching(false);
      return;
    }

    // 1. Instant Cache hit (0ms)
    if (searchCache.has(q)) {
      const cached = searchCache.get(q)!;
      setResults(cached.results);
      setSuggestions(cached.suggestions);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTitlesLive(q, titlesRef.current)
      .then((res) => {
        if (!cancelled) {
          setSearchCacheEntry(q, res);
          setResults(res.results);
          setSuggestions(res.suggestions);
          registerTitles(res.results);
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, registerTitles]);

  const handleSuggestionClick = (term: string) => {
    setSearchParams({ q: term });
  };

  const popularKeywords = ['Action', 'Thriller', 'Sci-Fi', 'Comedy', 'Anime', 'Documentary', 'Drama'];

  return (
    <div className="page page--padded">
      {/* Suggestions / Tags */}
      {suggestions.length > 0 && query && (
        <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--c-text-3)', fontSize: '0.85rem' }}>Explore related:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="date-badge"
              style={{ cursor: 'pointer' }}
              onClick={() => handleSuggestionClick(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* When query is empty */}
      {!query.trim() ? (
        <div className="empty">
          <div className="empty__icon">
            <Search size={40} />
          </div>
          <h2>Search Movies, TV Shows & People</h2>
          <p>Find any movie or TV series on TMDB to stream instantly with vidsrc.</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '500px', marginTop: '1rem' }}>
            {popularKeywords.map((kw) => (
              <button
                key={kw}
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => handleSuggestionClick(kw)}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      ) : searching ? (
        <LoadingSkeleton type="grid" count={12} />
      ) : results.length === 0 ? (
        <div className="empty">
          <div className="empty__icon">
            <Search size={40} />
          </div>
          <h2>No matches found for "{query}" on TMDB</h2>
          <p>
            Suggestions:
            <br />
            • Try different keywords or check spelling
            <br />
            • Try searching by actor name or original title
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
            {popularKeywords.map((kw) => (
              <button
                key={kw}
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => handleSuggestionClick(kw)}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--c-text-soft)' }}>
            TMDB Results for <span style={{ color: '#fff' }}>"{query}"</span> ({results.length})
          </h2>
          <div className="skeleton-grid">
            {results.map((item) => (
              <MovieCard key={item.id} title={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
