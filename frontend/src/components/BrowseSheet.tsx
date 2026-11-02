import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  X,
  Compass,
  Sparkles,
  Users,
  Globe,
  Bookmark,
  ChevronRight,
  Flame,
  Tv,
} from 'lucide-react';
import { useLockBodyScroll, useOnClickOutside } from '../hooks';
import './browseSheet.css';

interface BrowseSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const GENRE_SHORTCUTS = [
  { name: 'Action', path: '/movies?genre=Action' },
  { name: 'Romance', path: '/kdrama' },
  { name: 'Comedy', path: '/movies?genre=Comedy' },
  { name: 'Thriller & Crime', path: '/kdrama' },
  { name: 'Sci-Fi & Fantasy', path: '/movies?genre=Sci-Fi' },
  { name: 'Horror', path: '/movies?genre=Horror' },
  { name: 'Animation & Anime', path: '/tv?genre=Animation' },
  { name: 'Drama', path: '/tv?genre=Drama' },
  { name: 'Documentary', path: '/movies?genre=Documentary' },
  { name: 'Family & Kids', path: '/movies?genre=Family' },
];

export function BrowseSheet({ isOpen, onClose }: BrowseSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useLockBodyScroll(isOpen);
  useOnClickOutside(sheetRef, onClose, isOpen);

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="browse-sheet-backdrop" aria-modal="true" role="dialog">
      <div ref={sheetRef} className="browse-sheet">
        {/* Pull Handle Indicator */}
        <div className="browse-sheet__handle-bar">
          <div className="browse-sheet__handle" />
        </div>

        {/* Header */}
        <div className="browse-sheet__header">
          <div className="browse-sheet__title">
            <Compass size={20} color="#e50914" />
            <span>Explore Categories</span>
          </div>
          <button
            type="button"
            className="browse-sheet__close"
            onClick={onClose}
            aria-label="Close Categories Sheet"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="browse-sheet__content">
          {/* Featured Hubs */}
          <div>
            <div className="browse-sheet__section-label">Featured Collections</div>
            <div className="browse-sheet__hubs">
              {/* K-Drama Hub Highlight */}
              <Link
                to="/kdrama"
                className="browse-hub-card browse-hub-card--kdrama"
                onClick={onClose}
              >
                <div className="browse-hub-card__left">
                  <div className="browse-hub-card__icon">
                    <Sparkles size={20} />
                  </div>
                  <div className="browse-hub-card__info">
                    <div className="browse-hub-card__name-row">
                      <span className="browse-hub-card__name">K-Drama</span>
                      <span className="browse-hub-card__badge">New &amp; Hot</span>
                    </div>
                    <span className="browse-hub-card__desc">
                      Korean dramas, romance, thrillers &amp; cinema
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="browse-hub-card__arrow" />
              </Link>

              {/* Anime & Animation */}
              <Link
                to="/tv"
                className="browse-hub-card"
                onClick={onClose}
              >
                <div className="browse-hub-card__left">
                  <div className="browse-hub-card__icon">
                    <Tv size={20} />
                  </div>
                  <div className="browse-hub-card__info">
                    <div className="browse-hub-card__name-row">
                      <span className="browse-hub-card__name">Anime &amp; Series</span>
                    </div>
                    <span className="browse-hub-card__desc">
                      Acclaimed series, animated hits &amp; weekly releases
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="browse-hub-card__arrow" />
              </Link>

              {/* Community & Social */}
              <Link
                to="/community"
                className="browse-hub-card"
                onClick={onClose}
              >
                <div className="browse-hub-card__left">
                  <div className="browse-hub-card__icon">
                    <Users size={20} />
                  </div>
                  <div className="browse-hub-card__info">
                    <div className="browse-hub-card__name-row">
                      <span className="browse-hub-card__name">Community &amp; Social</span>
                      <span className="browse-hub-card__badge browse-hub-card__badge--neutral">
                        Discussions
                      </span>
                    </div>
                    <span className="browse-hub-card__desc">
                      Reviews, public watchlists &amp; episode chat
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="browse-hub-card__arrow" />
              </Link>

              {/* Browse by Languages */}
              <Link
                to="/browse/languages"
                className="browse-hub-card"
                onClick={onClose}
              >
                <div className="browse-hub-card__left">
                  <div className="browse-hub-card__icon">
                    <Globe size={20} />
                  </div>
                  <div className="browse-hub-card__info">
                    <div className="browse-hub-card__name-row">
                      <span className="browse-hub-card__name">Browse by Languages</span>
                    </div>
                    <span className="browse-hub-card__desc">
                      Korean, English, Japanese, Spanish audio &amp; subs
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="browse-hub-card__arrow" />
              </Link>

              {/* My List */}
              <Link
                to="/my-list"
                className="browse-hub-card"
                onClick={onClose}
              >
                <div className="browse-hub-card__left">
                  <div className="browse-hub-card__icon">
                    <Bookmark size={20} />
                  </div>
                  <div className="browse-hub-card__info">
                    <div className="browse-hub-card__name-row">
                      <span className="browse-hub-card__name">My Watchlist</span>
                    </div>
                    <span className="browse-hub-card__desc">
                      Your saved movies &amp; series
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="browse-hub-card__arrow" />
              </Link>
            </div>
          </div>

          {/* Popular Genres Grid */}
          <div>
            <div className="browse-sheet__section-label">All Genres</div>
            <div className="browse-sheet__genres-grid">
              {GENRE_SHORTCUTS.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  className="browse-genre-pill"
                  onClick={() => handleNavigate(g.path)}
                >
                  <span>{g.name}</span>
                  <ChevronRight size={14} opacity={0.6} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

