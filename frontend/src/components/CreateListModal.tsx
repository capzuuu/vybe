import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Check, Plus, Film } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCommunity } from '../contexts/CommunityContext';
import { useCatalog } from '../contexts/CatalogContext';
import { useToast } from '../contexts/ToastContext';
import { useLockBodyScroll } from '../hooks';
import './modal.css';

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitleId?: string;
}

export function CreateListModal({ isOpen, onClose, initialTitleId }: CreateListModalProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { createPublicList } = useCommunity();
  const { titles } = useCatalog();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialTitleId ? [initialTitleId] : []);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLockBodyScroll(isOpen);

  // If unauthenticated user tries to view or open create list modal, redirect to login
  useEffect(() => {
    if (isOpen && !isAuthenticated) {
      onClose();
      showToast('Please sign in to create your public watchlist.', { icon: 'info' });
      navigate('/login', {
        state: {
          from: { pathname: '/community', search: '?create=list' },
        },
      });
    }
  }, [isOpen, isAuthenticated, onClose, navigate, showToast]);

  const filteredTitles = useMemo(() => {
    if (!search.trim()) return titles.slice(0, 16);
    const q = search.toLowerCase();
    return titles.filter((t) => t.name.toLowerCase().includes(q) || t.genres.some((g) => g.toLowerCase().includes(q)));
  }, [titles, search]);

  if (!isOpen) return null;

  const toggleTitleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedIds.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const sanitizedTitle = title.trim().slice(0, 100);
      const sanitizedDesc = (description.trim() || 'Curated movie collection on Vybe.').slice(0, 400);

      const ok = await createPublicList({
        title: sanitizedTitle,
        description: sanitizedDesc,
        titleIds: selectedIds,
        isPublic,
      });

      if (ok) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div
        className="modal-container"
        style={{
          maxWidth: '620px',
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
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem', color: '#fff' }}>
            Create Curated List
          </h2>
          <p style={{ margin: 0, color: 'var(--c-text-3)', fontSize: '0.9rem' }}>
            Share your favorite cinema themes and series with fellow Vybe cinephiles.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* List Title */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="list-title"
              style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#ccc' }}
            >
              List Title *
            </label>
            <input
              id="list-title"
              type="text"
              required
              placeholder="e.g. Best Mind-Bending Sci-Fi of All Time"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: '#242426',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="list-desc"
              style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#ccc' }}
            >
              Description (Optional)
            </label>
            <textarea
              id="list-desc"
              rows={2}
              placeholder="A few words explaining the vibe of this collection..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: '#242426',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '0.9rem',
                lineHeight: 1.4,
                boxSizing: 'border-box',
                resize: 'none',
              }}
            />
          </div>

          {/* Visibility toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              padding: '0.75rem 1rem',
              background: '#222225',
              borderRadius: '8px',
            }}
          >
            <div>
              <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                Make List Public
              </span>
              <span style={{ fontSize: '0.8rem', color: '#888' }}>
                {isPublic ? 'Visible to the entire Vybe community' : 'Only visible to you on your profile'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              style={{ accentColor: 'var(--c-primary, #e50914)', width: 18, height: 18, cursor: 'pointer' }}
            />
          </div>

          {/* Title Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#ccc' }}>
                Select Titles ({selectedIds.length} selected)
              </label>
            </div>

            {/* Quick search input */}
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search
                size={16}
                color="#888"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search catalog to add titles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                  borderRadius: '6px',
                  background: '#242426',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Titles Picker Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '0.5rem',
                maxHeight: '180px',
                overflowY: 'auto',
                padding: '0.25rem',
              }}
            >
              {filteredTitles.map((t) => {
                const isSelected = selectedIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTitleSelection(t.id)}
                    style={{
                      background: isSelected ? 'rgba(229, 9, 20, 0.25)' : '#262628',
                      border: `1px solid ${isSelected ? '#e50914' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '6px',
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: '#fff',
                      fontSize: '0.8rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '3px',
                        background: isSelected ? '#e50914' : 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected ? <Check size={12} color="#fff" /> : <Plus size={12} color="#aaa" />}
                    </div>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary btn--sm"
              disabled={!title.trim() || selectedIds.length === 0 || isSubmitting}
            >
              {isSubmitting ? 'Publishing...' : `Publish List (${selectedIds.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

