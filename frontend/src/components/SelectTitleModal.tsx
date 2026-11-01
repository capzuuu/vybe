import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Star, Film, Sparkles } from 'lucide-react';
import { useCatalog } from '../contexts/CatalogContext';
import { useLockBodyScroll } from '../hooks';
import type { Title } from '../types';
import './modal.css';

interface SelectTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTitle: (title: Title) => void;
  mode: 'review' | 'recommend';
}

export function SelectTitleModal({ isOpen, onClose, onSelectTitle, mode }: SelectTitleModalProps) {
  const { titles } = useCatalog();
  const [query, setQuery] = useState('');

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredTitles = useMemo(() => {
    if (!query.trim()) return titles.slice(0, 18);
    const q = query.toLowerCase();
    return titles.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.genres.some((g) => g.toLowerCase().includes(q)) ||
        t.cast.some((c) => c.toLowerCase().includes(q)) ||
        t.creators.some((c) => c.toLowerCase().includes(q))
    );
  }, [titles, query]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div
        className="modal-container"
        style={{
          maxWidth: '560px',
          padding: '2rem',
          background: '#18181a',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <button
          type="button"
          className="modal-close-btn circle-btn"
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}
        >
          <X size={20} />
        </button>

        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {mode === 'review' ? (
              <>
                <Star size={20} color="#ffb703" fill="#ffb703" />
                <span>Choose Title to Review</span>
              </>
            ) : (
              <>
                <Sparkles size={20} color="var(--c-primary, #e50914)" />
                <span>Choose Title to Recommend</span>
              </>
            )}
          </h2>
          <p style={{ margin: 0, color: 'var(--c-text-3)', fontSize: '0.9rem' }}>
            Pick any movie or series from the Vybe library to share with the community.
          </p>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }}
          />
          <input
            type="text"
            placeholder="Search by title, genre, director..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.6rem',
              borderRadius: '8px',
              background: '#242426',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#fff',
              fontSize: '0.95rem',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Titles list */}
        <div
          style={{
            maxHeight: '340px',
            overflowY: 'auto',
            display: 'grid',
            gap: '0.6rem',
            paddingRight: '0.25rem',
          }}
        >
          {filteredTitles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#888', fontSize: '0.9rem' }}>
              No titles found matching &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredTitles.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  onSelectTitle(t);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  background: '#202022',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'background 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#28282b';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#202022';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <img
                  src={t.poster || t.backdrop}
                  alt={t.name}
                  style={{
                    width: '38px',
                    height: '54px',
                    borderRadius: '4px',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
                    {t.year} &bull; {t.type === 'series' ? 'TV Series' : 'Movie'} &bull; {t.genres.slice(0, 2).join(', ')}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                >
                  Select
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
