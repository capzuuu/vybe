import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Title } from '../types';
import { SmartImage } from './ui/SmartImage';
import { useDetails } from '../contexts/UIContext';
import './carousel.css';

interface TopTenCarouselProps {
  title?: string;
  titles: Title[];
}

function TopTenCarouselComponent({ title = 'Top 10 Today', titles }: TopTenCarouselProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const { openDetails } = useDetails();

  const top10 = useMemo(() => {
    const seen = new Set<string>();
    return titles.filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 10);
  }, [titles]);

  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      const nextLeft = scrollLeft > 20;
      const nextRight = scrollLeft < scrollWidth - clientWidth - 20;
      setCanScrollLeft((prev) => (prev !== nextLeft ? nextLeft : prev));
      setCanScrollRight((prev) => (prev !== nextRight ? nextRight : prev));
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [top10]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.8 : clientWidth * 0.8;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 400);
    }
  };

  if (!top10.length) return null;

  return (
    <div className="carousel-row top-ten-row">
      <h2 className="carousel-row__title">
        <span>{title}</span>
        <ChevronRight size={18} className="carousel-row__title-icon" />
      </h2>

      <div className="carousel-row__container">
        {canScrollLeft && (
          <button
            type="button"
            className="carousel-arrow carousel-arrow--left"
            onClick={() => handleScroll('left')}
            aria-label="Scroll Top 10 left"
          >
            <ChevronLeft size={36} />
          </button>
        )}

        <div
          ref={rowRef}
          className="carousel-row__track top-ten-track"
          onScroll={checkScroll}
          tabIndex={0}
          role="region"
          aria-label={title}
        >
          {top10.map((item, idx) => {
            const rank = idx + 1;
            return (
              <div
                key={item.id}
                className="top-ten-card"
                onClick={() => openDetails(item.id, item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetails(item.id, item);
                  }
                }}
                aria-label={`Rank ${rank}: ${item.name}`}
              >
                {/* SVG Outlined Number Layered Behind */}
                <div className="top-ten-card__number" aria-hidden="true">
                  <svg viewBox="0 0 100 130" className="top-ten-svg">
                    <text
                      x="50%"
                      y="110"
                      textAnchor="middle"
                      className="top-ten-text-stroke"
                    >
                      {rank}
                    </text>
                    <text
                      x="50%"
                      y="110"
                      textAnchor="middle"
                      className="top-ten-text-fill"
                    >
                      {rank}
                    </text>
                  </svg>
                </div>

                {/* Movie Poster */}
                <div className="top-ten-card__art">
                  <SmartImage
                    src={item.poster}
                    alt={item.name}
                    fallbackLabel={item.name}
                    accent={item.accent}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {canScrollRight && (
          <button
            type="button"
            className="carousel-arrow carousel-arrow--right"
            onClick={() => handleScroll('right')}
            aria-label="Scroll Top 10 right"
          >
            <ChevronRight size={36} />
          </button>
        )}
      </div>
    </div>
  );
}

export const TopTenCarousel = React.memo(TopTenCarouselComponent);

