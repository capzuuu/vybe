import React, { useRef, useState, useEffect } from 'react';
import {
  Flame,
  Smile,
  Frown,
  Ghost,
  Zap,
  Heart,
  Compass,
  Coffee,
  X,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import type { Title } from '../types';
import './moodbar.css';

export type MoodType =
  | 'all'
  | 'happy'
  | 'sad'
  | 'scared'
  | 'excited'
  | 'romantic'
  | 'curious'
  | 'chill';

export interface MoodItem {
  id: MoodType;
  icon: LucideIcon;
  name: string;
  tagline: string;
  accent: string;
  glow: string;
  bg: string;
}

export const MOODS: MoodItem[] = [
  {
    id: 'all',
    icon: Flame,
    name: 'All Vybes',
    tagline: 'Personalized recommendations, trending hits & new releases',
    accent: '#e50914',
    glow: 'rgba(229, 9, 20, 0.4)',
    bg: 'rgba(229, 9, 20, 0.18)',
  },
  {
    id: 'happy',
    icon: Smile,
    name: 'Happy',
    tagline: 'Feel-good comedies, lighthearted fun & laugh-out-loud hits',
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.45)',
    bg: 'rgba(245, 158, 11, 0.18)',
  },
  {
    id: 'sad',
    icon: Frown,
    name: 'Sad',
    tagline: 'Emotional tearjerkers, touching dramas & poignant stories',
    accent: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.45)',
    bg: 'rgba(59, 130, 246, 0.18)',
  },
  {
    id: 'scared',
    icon: Ghost,
    name: 'Scared',
    tagline: 'Spine-chilling horror, dark thrillers & supernatural suspense',
    accent: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.45)',
    bg: 'rgba(168, 85, 247, 0.18)',
  },
  {
    id: 'excited',
    icon: Zap,
    name: 'Excited',
    tagline: 'High-octane action, pulse-pounding adventures & epic quests',
    accent: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.45)',
    bg: 'rgba(239, 68, 68, 0.18)',
  },
  {
    id: 'romantic',
    icon: Heart,
    name: 'Romantic',
    tagline: 'Swoon-worthy romances, love stories & heartfelt passion',
    accent: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.45)',
    bg: 'rgba(236, 72, 153, 0.18)',
  },
  {
    id: 'curious',
    icon: Compass,
    name: 'Curious',
    tagline: 'Wild sci-fi, shocking plot twists & mind-bending mysteries',
    accent: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.45)',
    bg: 'rgba(6, 182, 212, 0.18)',
  },
  {
    id: 'chill',
    icon: Coffee,
    name: 'Chill',
    tagline: 'Comfort watches, easy-going animation & cozy family favorites',
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.45)',
    bg: 'rgba(16, 185, 129, 0.18)',
  },
];

/**
 * Filters a list of titles based on the selected mood's genre mapping.
 */
export function filterTitlesByMood(titles: Title[], mood: MoodType): Title[] {
  if (mood === 'all') return titles;
  return titles.filter((t) => {
    const genres = (t.genres || []).map((g) => g.toLowerCase());
    switch (mood) {
      case 'happy':
        return genres.some((g) => g.includes('comedy'));
      case 'sad':
        return genres.some((g) => g.includes('drama'));
      case 'scared':
        return genres.some((g) => g.includes('horror') || g.includes('thriller'));
      case 'excited':
        return genres.some((g) => g.includes('action') || g.includes('adventure'));
      case 'romantic':
        return genres.some((g) => g.includes('romance'));
      case 'curious':
        return genres.some(
          (g) =>
            g.includes('sci-fi') ||
            g.includes('science fiction') ||
            g.includes('mystery') ||
            g.includes('documentary')
        );
      case 'chill':
        return genres.some(
          (g) => g.includes('animation') || g.includes('family') || g.includes('music')
        );
      default:
        return true;
    }
  });
}

interface MoodBarProps {
  selectedMood: MoodType;
  onSelectMood: (mood: MoodType) => void;
  filteredCount?: number;
}

export function MoodBar({ selectedMood, onSelectMood, filteredCount }: MoodBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const activeConfig = MOODS.find((m) => m.id === selectedMood) || MOODS[0];
  const ActiveIcon = activeConfig.icon;

  const checkScroll = () => {
    if (trackRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
      setCanScrollLeft(scrollLeft > 15);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);
    }
  };

  useEffect(() => {
    checkScroll();
    const track = trackRef.current;
    if (track) {
      track.addEventListener('scroll', checkScroll, { passive: true });
    }
    window.addEventListener('resize', checkScroll);
    return () => {
      if (track) track.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const handleScroll = (dir: 'left' | 'right') => {
    if (trackRef.current) {
      const distance = trackRef.current.clientWidth * 0.75;
      trackRef.current.scrollBy({
        left: dir === 'left' ? -distance : distance,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 350);
    }
  };

  return (
    <section className="mood-bar-section" aria-label="Mood Switcher">
      {/* Dynamic Ambient Glow Backdrop */}
      {selectedMood !== 'all' && (
        <div
          className="mood-ambient-glow"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${activeConfig.glow} 0%, rgba(20, 20, 20, 0) 70%)`,
          }}
        />
      )}

      {/* Row Header - Consistent with Netflix row titles */}
      <div className="mood-bar__header">
        <h2 className="mood-bar__title">What's your mood tonight?</h2>

        {selectedMood !== 'all' && (
          <button
            type="button"
            className="genre-clear-btn"
            onClick={() => onSelectMood('all')}
            title="Reset to all vybes"
            aria-label="Reset mood filter"
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Carousel Track with Netflix Arrows */}
      <div className="mood-bar__track-container">
        {canScrollLeft && (
          <button
            type="button"
            className="carousel-arrow carousel-arrow--left mood-bar-arrow"
            onClick={() => handleScroll('left')}
            aria-label="Scroll moods left"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div ref={trackRef} className="mood-pills-track" role="tablist">
          {MOODS.map((mood) => {
            const isActive = selectedMood === mood.id;
            const Icon = mood.icon;

            return (
              <button
                key={mood.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`mood-pill ${isActive ? 'mood-pill--active' : ''}`}
                style={
                  isActive
                    ? ({
                        '--pill-accent': mood.accent,
                        '--pill-glow': mood.glow,
                        '--pill-bg': mood.bg,
                      } as React.CSSProperties)
                    : undefined
                }
                onClick={() => onSelectMood(mood.id)}
              >
                <Icon
                  className="mood-pill__icon"
                  size={17}
                  color={isActive ? mood.accent : undefined}
                />
                <span>{mood.name}</span>
              </button>
            );
          })}
        </div>

        {canScrollRight && (
          <button
            type="button"
            className="carousel-arrow carousel-arrow--right mood-bar-arrow"
            onClick={() => handleScroll('right')}
            aria-label="Scroll moods right"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* Active Mood Tagline / Context Sub-Banner */}
      {selectedMood !== 'all' && (
        <div
          className="mood-active-tagline"
          style={
            {
              '--tagline-accent': activeConfig.accent,
            } as React.CSSProperties
          }
        >
          <div className="mood-active-text">
            <ActiveIcon size={17} color={activeConfig.accent} style={{ flexShrink: 0 }} />
            <span className="mood-active-name">{activeConfig.name}</span>
            <span className="mood-active-sep">•</span>
            <span className="mood-active-desc">{activeConfig.tagline}</span>
          </div>
          {typeof filteredCount === 'number' && (
            <span className="mood-count-badge">{filteredCount} Titles</span>
          )}
        </div>
      )}
    </section>
  );
}
