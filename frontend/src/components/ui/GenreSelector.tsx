import React from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useScrolled } from '../../hooks';
import './ui.css';

interface GenreSelectorProps {
  title: string;
  genres: string[];
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  viewMode?: 'grid' | 'rows';
  onToggleViewMode?: (mode: 'grid' | 'rows') => void;
  hasHero?: boolean;
}

export function GenreSelector({
  title,
  genres,
  selectedGenre,
  onSelectGenre,
  viewMode = 'rows',
  onToggleViewMode,
  hasHero = false,
}: GenreSelectorProps) {
  const isScrolled = useScrolled(20);

  return (
    <header
      className={`sub-header ${isScrolled ? 'sub-header--scrolled' : ''} ${hasHero ? 'sub-header--has-hero' : ''}`}
      aria-label={`${title} filter and layout`}
    >
      <div className="sub-header__container">
        <div className="sub-header__left">
          <h1 className="sub-header__title">{title}</h1>

          <div className="genre-dropdown-wrapper">
            <select
              className={`genre-select ${selectedGenre !== 'All' ? 'genre-select--active' : ''}`}
              value={selectedGenre}
              onChange={(e) => onSelectGenre(e.target.value)}
              aria-label="Filter by genre"
            >
              <option value="All">Genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <ChevronDown className="genre-chevron" size={15} />
          </div>

          {selectedGenre !== 'All' && (
            <button
              type="button"
              className="genre-clear-btn"
              onClick={() => onSelectGenre('All')}
              title="Reset to all genres"
              aria-label="Reset genre filter"
            >
              <X size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>

        {onToggleViewMode && (
          <div className="sub-header__right" role="radiogroup" aria-label="Layout view">
            <div className="view-mode-group">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'rows' ? 'active' : ''}`}
                onClick={() => onToggleViewMode('rows')}
                title="Rows view"
                aria-checked={viewMode === 'rows'}
                role="radio"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
                </svg>
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => onToggleViewMode('grid')}
                title="Grid view"
                aria-checked={viewMode === 'grid'}
                role="radio"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M4 4h7v7H4zm9 0h7v7h-7zm-9 9h7v7H4zm9 0h7v7h-7z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
