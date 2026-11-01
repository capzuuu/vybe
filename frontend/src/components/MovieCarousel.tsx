import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Title } from '../types';
import { MovieCard } from './MovieCard';
import './carousel.css';

interface MovieCarouselProps {
  title: string;
  titles: Title[];
  isPoster?: boolean;
  isContinueWatching?: boolean;
}

function MovieCarouselComponent({
  title,
  titles,
  isPoster = false,
  isContinueWatching = false,
}: MovieCarouselProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
  }, [titles]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.8 : clientWidth * 0.8;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 400);
    }
  };

  // Defensive de-duplication to ensure 100% unique React keys
  const uniqueTitles = useMemo(() => {
    const seen = new Set<string>();
    return titles.filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [titles]);

  if (!uniqueTitles.length) return null;

  return (
    <div className="carousel-row">
      <h2 className="carousel-row__title">
        <span>{title}</span>
        <ChevronRight size={18} className="carousel-row__title-icon" />
      </h2>

      <div className="carousel-row__container">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            type="button"
            className="carousel-arrow carousel-arrow--left"
            onClick={() => handleScroll('left')}
            aria-label="Scroll row left"
          >
            <ChevronLeft size={36} />
          </button>
        )}

        {/* Scrollable Track */}
        <div
          ref={rowRef}
          className="carousel-row__track"
          onScroll={checkScroll}
          tabIndex={0}
          role="region"
          aria-label={title}
        >
          {uniqueTitles.map((item) => (
            <MovieCard
              key={item.id}
              title={item}
              isPoster={isPoster}
              isContinueWatching={isContinueWatching}
            />
          ))}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            type="button"
            className="carousel-arrow carousel-arrow--right"
            onClick={() => handleScroll('right')}
            aria-label="Scroll row right"
          >
            <ChevronRight size={36} />
          </button>
        )}
      </div>
    </div>
  );
}

export const MovieCarousel = React.memo(MovieCarouselComponent);

