import React, { useRef, useState, useEffect } from 'react';
import { Play, Plus, Check, ThumbsUp, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { usePreview, useDetails } from '../contexts/UIContext';
import { useLibrary } from '../contexts/ProfileContext';
import { usePlayTitle, useListToggle, useLikeToggle } from '../hooks';
import { TitleArt } from './ui/TitleArt';
import { SmartImage } from './ui/SmartImage';
import { formatLength } from '../utils/format';
import './card.css';

export function HoverPreview() {
  const { preview, closePreview } = usePreview();
  const { openDetails } = useDetails();
  const { isInList, isLiked } = useLibrary();
  const playTitle = usePlayTitle();
  const toggleList = useListToggle();
  const toggleLike = useLikeToggle();

  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const title = preview?.title;
  const inList = title ? isInList(title.id) : false;
  const liked = title ? isLiked(title.id) : false;

  // Auto-play trailer video after 800ms
  useEffect(() => {
    if (!title) return;
    setIsPlayingVideo(false);
    const timer = setTimeout(() => {
      setIsPlayingVideo(true);
    }, 850);
    return () => clearTimeout(timer);
  }, [title]);

  useEffect(() => {
    if (isPlayingVideo && videoRef.current && title) {
      videoRef.current.currentTime = title.trailerStart || 0;
      videoRef.current.play().catch(() => {
        setIsPlayingVideo(false);
      });
    }
  }, [isPlayingVideo, title]);

  if (!preview || !title) return null;

  // Compute position coordinates from rect
  const { rect } = preview;
  const previewWidth = Math.max(320, rect.width * 1.45);
  let left = rect.left + rect.width / 2 - previewWidth / 2;
  const top = rect.top + window.scrollY - 30;

  // Clamp left to avoid edge overflow
  const margin = 24;
  if (left < margin) left = margin;
  if (left + previewWidth > window.innerWidth - margin) {
    left = window.innerWidth - margin - previewWidth;
  }

  return (
    <div
      ref={containerRef}
      className="hover-preview"
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${previewWidth}px`,
      }}
      onMouseEnter={() => {}}
      onMouseLeave={closePreview}
    >
      <div className="hover-preview__card">
        {/* Media Container */}
        <div className="hover-preview__media" onClick={() => openDetails(title.id)}>
          <SmartImage
            src={title.backdrop}
            alt={title.name}
            className={`hover-preview__img ${isPlayingVideo ? 'hidden' : ''}`}
            fallbackLabel={title.name}
            accent={title.accent}
          />

          {isPlayingVideo && (
            <video
              ref={videoRef}
              src={title.videoUrl}
              className="hover-preview__video"
              autoPlay
              playsInline
              muted={isMuted}
            />
          )}

          <div className="hover-preview__title-art">
            <TitleArt title={title} size="preview" />
          </div>

          {isPlayingVideo && (
            <button
              type="button"
              className="hover-preview__mute"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted((prev) => !prev);
              }}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          )}
        </div>

        {/* Info & Controls */}
        <div className="hover-preview__details">
          <div className="hover-preview__buttons">
            <div className="hover-preview__buttons-left">
              <button
                type="button"
                className="circle-btn circle-btn--solid"
                onClick={() => {
                  closePreview();
                  playTitle(title);
                }}
                title="Play"
                aria-label={`Play ${title.name}`}
              >
                <Play size={16} fill="currentColor" />
              </button>

              <button
                type="button"
                className={`circle-btn ${inList ? 'circle-btn--active' : ''}`}
                onClick={() => toggleList(title)}
                title={inList ? 'Remove from My List' : 'Add to My List'}
                aria-label={inList ? 'Remove from My List' : 'Add to My List'}
              >
                {inList ? <Check size={16} /> : <Plus size={16} />}
              </button>

              <button
                type="button"
                className={`circle-btn ${liked ? 'circle-btn--active' : ''}`}
                onClick={() => toggleLike(title)}
                title={liked ? 'Rated' : 'I like this'}
                aria-label="Like"
              >
                <ThumbsUp size={16} fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>

            <button
              type="button"
              className="circle-btn"
              onClick={() => {
                closePreview();
                openDetails(title.id, title);
              }}
              title="More info"
              aria-label="More info"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          <div className="hover-preview__meta">
            <span className="match">{title.match}% Match</span>
            <span className="maturity">{title.maturity}</span>
            <span className="hover-preview__runtime">{formatLength(title)}</span>
            <span className="quality">{title.quality}</span>
          </div>

          <div className="hover-preview__genres dot-list">
            {title.genres.slice(0, 3).map((genre: string) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

