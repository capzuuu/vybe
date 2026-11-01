import './ui.css';

interface SkeletonProps {
  type?: 'hero' | 'row' | 'card' | 'grid';
  count?: number;
}

export function LoadingSkeleton({ type = 'row', count = 6 }: SkeletonProps) {
  if (type === 'hero') {
    return (
      <div className="skeleton-hero" aria-label="Loading featured content...">
        <div className="skeleton skeleton-hero__backdrop" />
        <div className="skeleton-hero__content">
          <div className="skeleton skeleton-hero__title" />
          <div className="skeleton skeleton-hero__desc" />
          <div className="skeleton-hero__buttons">
            <div className="skeleton skeleton-hero__btn" />
            <div className="skeleton skeleton-hero__btn" />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'grid') {
    return (
      <div className="skeleton-grid">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="skeleton-row-container">
      <div className="skeleton skeleton-row-title" />
      <div className="skeleton-row">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}

