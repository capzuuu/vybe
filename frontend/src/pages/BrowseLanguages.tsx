import React, { useState } from 'react';
import { useCatalog } from '../contexts/CatalogContext';
import { allLanguages } from '../services/catalogService';
import { MovieCard } from '../components/MovieCard';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

export function BrowseLanguages() {
  const { titles, loading } = useCatalog();
  const [preference, setPreference] = useState<'language' | 'audio' | 'subtitles'>('language');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [sortBy, setSortBy] = useState<'popularity' | 'year' | 'az'>('popularity');

  if (loading) {
    return (
      <div className="page page--padded">
        <LoadingSkeleton type="grid" count={12} />
      </div>
    );
  }

  const availableLanguages = allLanguages(titles, preference);

  const filtered = titles.filter((t) => {
    if (preference === 'language') return t.language === selectedLanguage;
    if (preference === 'audio') return t.audio.includes(selectedLanguage);
    if (preference === 'subtitles') return t.subtitles.includes(selectedLanguage);
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'year') return b.year - a.year;
    if (sortBy === 'az') return a.name.localeCompare(b.name);
    return b.popularity - a.popularity;
  });

  return (
    <div className="page page--padded">
      <h1 className="page__title">Browse by Languages</h1>

      {/* Selectors Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1.25rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '2.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--c-text-3)' }}>Select Your Preference</span>
          <select
            className="select"
            value={preference}
            onChange={(e) => {
              const pref = e.target.value as any;
              setPreference(pref);
              const langs = allLanguages(titles, pref);
              if (!langs.includes(selectedLanguage) && langs[0]) {
                setSelectedLanguage(langs[0]);
              }
            }}
          >
            <option value="language">Original Language</option>
            <option value="audio">Dubbed Audio</option>
            <option value="subtitles">Subtitles</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <select
            className="select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--c-text-3)' }}>Sort by</span>
          <select
            className="select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="popularity">Suggestions for You</option>
            <option value="year">Year Released</option>
            <option value="az">A-Z</option>
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          <h2>No matching titles found</h2>
          <p>Try switching between Original Language, Audio, or Subtitles.</p>
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

