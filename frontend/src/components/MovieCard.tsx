import React, { useRef } from 'react';
import type { Title } from '../types';
import { SmartImage } from './ui/SmartImage';
import { TitleArt } from './ui/TitleArt';
import { useDetails, usePreview } from '../contexts/UIContext';
import { useLibrary } from '../contexts/ProfileContext';
import { useCanHover, useIsMobile, usePlayTitle } from '../hooks';
import { X, Play } from 'lucide-react';
import './card.css';

interface MovieCardProps {
  title: Title;
  isPoster?: boolean;
  isContinueWatching?: boolean;
}

function MovieCardComponent({ title, isPoster = false, isContinueWatching = false }: MovieCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { openDetails } = useDetails();
  const { schedulePreview, cancelPreview } = usePreview();
  const { getProgress, removeProgress } = useLibrary();
  const canHover = useCanHover();
  const isMobile = useIsMobile();
  const playTitle = usePlayTitle();

  const progress = isContinueWatching ? getProgress(title.id) : undefined;
  const progressPercent = progress ? Math.min(100, Math.round((progress.position / progress.duration) * 100)) : 0;

  const handleMouseEnter = () => {
    if (canHover && cardRef.current && !isContinueWatching) {
      schedulePreview(title, cardRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (canHover) {
      cancelPreview();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // If continue watching, resume playback on click
    if (isContinueWatching) {
      playTitle(title, progress?.episodeId);
    } else {
      openDetails(title.id, title);
    }
  };

  const handleRemoveProgress = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeProgress(title.id);
  };

  return (
    <div
      ref={cardRef}
      className={`movie-card ${isPoster ? 'movie-card--poster' : ''} ${
        isContinueWatching ? 'movie-card--continue' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      aria-label={`${title.name}, ${title.year}, ${title.maturity}`}
    >
      <div className="movie-card__art">
        <SmartImage
          src={isPoster ? title.poster : title.backdrop}
          alt={title.name}
          fallbackLabel={title.name}
          accent={title.accent}
        />

        {/* Title artwork overlay if backdrop */}
        {!isPoster && (
          <div className="movie-card__title-overlay">
            <TitleArt title={title} size="card" />
          </div>
        )}

        {/* Continue Watching Overlay & Progress Bar */}
        {isContinueWatching && (
          <>
            <button
              type="button"
              className="continue-card__remove"
              onClick={handleRemoveProgress}
              aria-label="Remove from Continue Watching"
              title="Remove from row"
            >
              <X size={16} />
            </button>

            <div className="continue-card__play-btn">
              <Play size={24} fill="#fff" />
            </div>

            <div className="continue-card__bar-bg">
              <div
                className="continue-card__bar-fill"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>
          </>
        )}
      </div>

      {isContinueWatching && (
        <div className="continue-card__info">
          <span className="continue-card__name">{title.name}</span>
          <span className="continue-card__meta">
            {progress ? `${Math.max(1, Math.round((progress.duration - progress.position) / 60))}m left` : 'Resume'}
          </span>
        </div>
      )}
    </div>
  );
}

export const MovieCard = React.memo(MovieCardComponent);

