import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import type { Title } from '../types';
import { TitleArt } from './ui/TitleArt';
import { SmartImage } from './ui/SmartImage';
import { formatLength } from '../utils/format';
import { usePlayTitle } from '../hooks';
import { useDetails } from '../contexts/UIContext';
import './hero.css';

interface HeroBannerProps {
  titles: Title[];
}

export function HeroBanner({ titles }: HeroBannerProps) {
  const [index, setIndex] = useState(0);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playTitle = usePlayTitle();
  const { openDetails } = useDetails();

  const title = titles[index] || titles[0];

  // Rotate title every 15 seconds if trailer is not active
  useEffect(() => {
    if (!titles.length) return;
    const interval = setInterval(() => {
      setIsPlayingTrailer(false);
      setIndex((prev) => (prev + 1) % titles.length);
    }, 16000);
    return () => clearInterval(interval);
  }, [titles.length]);

  // Start video trailer preview after 2.5s delay
  useEffect(() => {
    setIsPlayingTrailer(false);
    const timer = setTimeout(() => {
      setIsPlayingTrailer(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, [index]);

  // Handle trailer video autoplay
  useEffect(() => {
    if (isPlayingTrailer && videoRef.current && title) {
      videoRef.current.currentTime = title.trailerStart || 0;
      videoRef.current.play().catch(() => {
        // Autoplay policy or error - keep backdrop
        setIsPlayingTrailer(false);
      });
    }
  }, [isPlayingTrailer, title]);

  if (!title) return null;

  return (
    <section className="hero" aria-label="Featured Title">
      <div className="hero__media">
        {/* Backdrop Image */}
        <SmartImage
          src={title.backdrop}
          alt={title.name}
          className={`hero__backdrop ${isPlayingTrailer ? 'hero__backdrop--hidden' : ''}`}
          eager
          fallbackLabel={title.name}
          accent={title.accent}
        />

        {/* Video Trailer Preview */}
        {isPlayingTrailer && (
          <video
            ref={videoRef}
            src={title.videoUrl}
            className="hero__video"
            autoPlay
            playsInline
            muted={isMuted}
            onEnded={() => setIsPlayingTrailer(false)}
          />
        )}

        {/* Cinematic Gradient Overlays */}
        <div className="hero__vignette-left" />
        <div className="hero__vignette-bottom" />
      </div>

      <div className="hero__content">
        <TitleArt title={title} size="hero" as="h1" className="hero__title" />

        <div className="hero__meta">
          <span className="match">{title.match}% Match</span>
          <span className="hero__meta-item">{title.year}</span>
          <span className="maturity">{title.maturity}</span>
          <span className="hero__meta-item">{formatLength(title)}</span>
          <span className="quality">{title.quality}</span>
        </div>

        <p className="hero__synopsis">{title.synopsis}</p>

        <div className="hero__actions">
          <button
            type="button"
            className="btn btn--play"
            onClick={() => playTitle(title)}
            aria-label={`Play ${title.name}`}
          >
            <Play fill="currentColor" size={24} />
            <span>Play</span>
          </button>

          <button
            type="button"
            className="btn btn--info"
            onClick={() => openDetails(title.id)}
            aria-label={`More information about ${title.name}`}
          >
            <Info size={24} />
            <span>More Info</span>
          </button>
        </div>
      </div>

      {/* Right controls: Mute audio toggle + Maturity tag */}
      <div className="hero__side-controls">
        {isPlayingTrailer && (
          <button
            type="button"
            className="circle-btn hero__mute-btn"
            onClick={() => setIsMuted((prev) => !prev)}
            aria-label={isMuted ? 'Unmute trailer' : 'Mute trailer'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}

        <div className="hero__rating-bar">
          <span className="hero__rating-tag">{title.maturity}</span>
        </div>
      </div>
    </section>
  );
}

