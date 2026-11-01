import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCommunity } from '../contexts/CommunityContext';
import { useLockBodyScroll } from '../hooks';
import type { Title } from '../types';
import './modal.css';

interface ReviewModalProps {
  title: Title;
  isOpen: boolean;
  onClose: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Terrible - 1/5',
  2: 'Mediocre - 2/5',
  3: 'Decent - 3/5',
  4: 'Great - 4/5',
  5: 'Masterpiece - 5/5',
};

export function ReviewModal({ title, isOpen, onClose }: ReviewModalProps) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { addReview, getUserTitleReview } = useCommunity();
  const existingReview = getUserTitleReview(title.id);

  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewTitle, setReviewTitle] = useState(existingReview?.reviewTitle || '');
  const [content, setContent] = useState(existingReview?.content || '');
  const [containsSpoilers, setContainsSpoilers] = useState(existingReview?.containsSpoilers || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (isOpen && !isAuthenticated) {
      onClose();
      showToast('Please sign in to rate and review movies.', { icon: 'info' });
      navigate('/login');
    }
  }, [isOpen, isAuthenticated, onClose, navigate, showToast]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    if (!isAuthenticated) {
      showToast('Please sign in to publish your review.', { icon: 'info' });
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      const sanitizedRating = Math.min(5, Math.max(1, rating || 5));
      const sanitizedTitle = (reviewTitle.trim() || `${sanitizedRating}★ Rating for ${title.name}`).slice(0, 120);
      const sanitizedContent = content.trim().slice(0, 2500);

      const ok = await addReview({
        titleId: title.id,
        titleName: title.name,
        rating: sanitizedRating,
        reviewTitle: sanitizedTitle,
        content: sanitizedContent,
        containsSpoilers,
      });

      if (ok) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div
        className="modal-container review-modal"
        style={{
          maxWidth: '540px',
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
            Rate &amp; Review
          </h2>
          <p style={{ margin: 0, color: 'var(--c-text-3)', fontSize: '0.9rem' }}>
            {title.name} ({title.year})
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Star Rating Widget */}
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    transition: 'transform 0.15s ease',
                  }}
                  aria-label={`${star} Stars`}
                >
                  <Star
                    size={32}
                    fill={star <= activeRating ? '#ffb703' : 'transparent'}
                    color={star <= activeRating ? '#ffb703' : '#555'}
                    style={{ transition: 'all 0.15s' }}
                  />
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.85rem', color: '#ffb703', fontWeight: 600 }}>
              {RATING_LABELS[activeRating] || 'Select your rating'}
            </span>
          </div>

          {/* Review Title */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="review-title"
              style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#ccc' }}
            >
              Headline (Optional)
            </label>
            <input
              id="review-title"
              type="text"
              maxLength={120}
              placeholder="e.g. Nolan does it again! A mind-bending masterpiece"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
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

          {/* Review Content */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="review-content"
              style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#ccc' }}
            >
              Your Review
            </label>
            <textarea
              id="review-content"
              rows={4}
              required
              maxLength={2500}
              placeholder="What did you think of the story, acting, cinematography, or soundtrack? Write your honest thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: '#242426',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Spoilers toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: '#aaa',
            }}
          >
            <input
              type="checkbox"
              checked={containsSpoilers}
              onChange={(e) => setContainsSpoilers(e.target.checked)}
              style={{ accentColor: 'var(--c-primary, #e50914)' }}
            />
            <AlertTriangle size={15} color="#e50914" />
            <span>This review contains major plot spoilers</span>
          </label>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={!content.trim() || isSubmitting}>
              {isSubmitting ? 'Posting...' : 'Post Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

