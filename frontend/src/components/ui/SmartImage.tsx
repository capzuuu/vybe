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
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setStatus('loading');
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) setStatus('loaded');
  }, [src]);

  return (
    <div className={`smart-img smart-img--${status} ${className}`}>
      {status !== 'error' ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          {...(eager ? { fetchpriority: 'high' } : {})}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
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

