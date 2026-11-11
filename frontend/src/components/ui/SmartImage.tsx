import { memo, useEffect, useRef, useState } from 'react';
import './ui.css';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Load immediately (hero / modal art). Defaults to lazy. */
  eager?: boolean;
  /** Shown on a generated gradient if the image fails to load. */
  fallbackLabel?: string;
  accent?: string;
  sizes?: string;
}

/**
 * Lazy-loaded image with shimmer placeholder, fade-in on load and a branded
 * gradient fallback when the network/image is unavailable.
 */
function SmartImageBase({ src, alt, className = '', eager, fallbackLabel, accent = '#3a1c1c' }: SmartImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error');
  const [attempt, setAttempt] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const retryTimerRef = useRef<number>();

  useEffect(() => {
    window.clearTimeout(retryTimerRef.current);
    setAttempt(0);
    setStatus(src ? 'loading' : 'error');
  }, [src]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    img.setAttribute('fetchpriority', eager ? 'high' : 'auto');
    if (status === 'loading' && img.complete && img.naturalWidth > 0) {
      setStatus('loaded');
    }
    return () => {
      window.clearTimeout(retryTimerRef.current);
    };
  }, [src, status, attempt, eager]);

  const handleError = () => {
    if (attempt < 1 && src) {
      retryTimerRef.current = window.setTimeout(() => {
        setAttempt((prev) => prev + 1);
      }, 900);
      return;
    }
    setStatus('error');
  };

  return (
    <div className={`smart-img smart-img--${status} ${className}`}>
      {status !== 'error' && src ? (
        <img
          key={`${src}-${attempt}`}
          ref={imgRef}
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onLoad={() => setStatus('loaded')}
          onError={handleError}
        />
      ) : (
        <div
          className="smart-img__fallback"
          style={{ background: `radial-gradient(120% 120% at 20% 10%, ${accent} 0%, #141414 70%)` }}
          role="img"
          aria-label={alt}
        >
          {fallbackLabel && <span>{fallbackLabel}</span>}
        </div>
      )}
    </div>
  );
}

export const SmartImage = memo(SmartImageBase);

