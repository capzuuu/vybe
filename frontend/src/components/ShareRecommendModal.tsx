import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Heart, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCommunity } from '../contexts/CommunityContext';
import { useLockBodyScroll } from '../hooks';
import type { Title } from '../types';
import './modal.css';

interface ShareRecommendModalProps {
  title: Title;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareRecommendModal({ title, isOpen, onClose }: ShareRecommendModalProps) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { shareRecommendation } = useCommunity();
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (isOpen && !isAuthenticated) {
      onClose();
      showToast('Please sign in to share a recommendation with the community.', { icon: 'info' });
      navigate('/login');
    }
  }, [isOpen, isAuthenticated, onClose, navigate, showToast]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || isSubmitting) return;

    if (!isAuthenticated) {
      showToast('Please sign in to share your recommendation.', { icon: 'info' });
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      const sanitizedNote = note.trim().slice(0, 500);
      const ok = await shareRecommendation({
        titleId: title.id,
        titleName: title.name,
        titleBackdrop: title.backdrop,
        note: sanitizedNote,
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
          maxWidth: '520px',
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
            <Share2 size={22} color="var(--c-primary, #e50914)" />
            <span>Recommend to Community</span>
          </h2>
          <p style={{ margin: 0, color: 'var(--c-text-3)', fontSize: '0.9rem' }}>
            Tell your followers and the Vybe community why they should watch this!
          </p>
        </div>

        {/* Title Preview Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.85rem 1rem',
            background: '#242426',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <img
            src={title.backdrop || title.poster}
            alt={title.name}
            style={{ width: '80px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
          />
          <div>
            <h3 style={{ margin: '0 0 0.2rem', fontSize: '1rem', color: '#fff' }}>{title.name}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--c-text-3)' }}>
              {title.year} &bull; {title.genres.slice(0, 2).join(', ')} &bull; {title.match}% Match
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="rec-note"
              style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#ccc' }}
            >
              Your Recommendation Note *
            </label>
            <textarea
              id="rec-note"
              rows={3}
              required
              maxLength={500}
              placeholder="e.g. Absolutely unreal visuals and storytelling. If you liked Blade Runner, stop scrolling and watch this right now!"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: '#242426',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '0.9rem',
                lineHeight: 1.45,
                boxSizing: 'border-box',
                resize: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary btn--sm"
              disabled={!note.trim() || isSubmitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Send size={15} />
              <span>{isSubmitting ? 'Posting...' : 'Post Recommendation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

