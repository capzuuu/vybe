import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Maximize,
  Minimize,
  FastForward,
  ListVideo,
  RefreshCw,
  Zap,
  ShieldCheck,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useCatalog } from '../contexts/CatalogContext';
import { useLibrary } from '../contexts/ProfileContext';
import { getVidlinkUrl } from '../utils/tmdb';
import { fetchTitleById } from '../services/tmdbService';
import type { Episode, Season, Title } from '../types';
import './watch.css';

export function Watch() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getTitle } = useCatalog();
  const { getProgress, saveProgress } = useLibrary();

  const cachedTitle = id ? getTitle(id) : null;
  const [title, setTitle] = useState<Title | null>(cachedTitle || null);
  const [loadingTitle, setLoadingTitle] = useState(!cachedTitle);

  const epParam = searchParams.get('ep');

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<number>();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [episodesMenuOpen, setEpisodesMenuOpen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Fetch complete title info (with episodes & seasons) if needed
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    fetchTitleById(id)
      .then((full) => {
        if (!cancelled && full) {
          setTitle(full);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoadingTitle(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Seasons and episodes calculation for TV shows
  const seasons: Season[] =
    title?.type === 'series'
      ? title.seasons && title.seasons.length > 0
        ? title.seasons
        : [
          {
            number: 1,
            episodes: Array.from({ length: 8 }).map((_, idx) => ({
              id: `${title?.id || 'series'}-s1e${idx + 1}`,
              season: 1,
              number: idx + 1,
              name: `Episode ${idx + 1}`,
              synopsis: `Season 1, Episode ${idx + 1} of ${title?.name || 'Series'}.`,
              duration: 50,
              still: title?.backdrop || '',
              videoUrl: '',
            })),
          },
        ]
      : [];

  const allEpisodes: Episode[] = seasons.flatMap((s: Season) => s.episodes);
  const savedProgress = title ? getProgress(title.id) : undefined;

  // Active episode determination
  const activeEpisode =
    allEpisodes.find((e) => e.id === epParam) ||
    allEpisodes.find((e) => e.id === savedProgress?.episodeId) ||
    allEpisodes[0];

  // Extract season and episode numbers safely
  let currentSeason = 1;
  let currentEpisodeNum = 1;

  if (activeEpisode) {
    currentSeason = activeEpisode.season || 1;
    currentEpisodeNum = activeEpisode.number || 1;
  } else if (epParam) {
    const match = epParam.match(/s(\d+)e(\d+)/i);
    if (match) {
      currentSeason = parseInt(match[1], 10) || 1;
      currentEpisodeNum = parseInt(match[2], 10) || 1;
    }
  }

  // Viewing season state for browsing seasons inside the player
  const [viewingSeason, setViewingSeason] = useState<number>(currentSeason);

  useEffect(() => {
    if (currentSeason) {
      setViewingSeason(currentSeason);
    }
  }, [currentSeason]);

  const activeIndex = allEpisodes.findIndex((e) => e.id === activeEpisode?.id);
  const nextEpisode =
    activeIndex >= 0 && activeIndex < allEpisodes.length - 1 ? allEpisodes[activeIndex + 1] : null;

  // Episodes of the currently viewed season
  const currentSeasonEpisodes =
    seasons.find((s) => s.number === viewingSeason)?.episodes ||
    seasons[0]?.episodes ||
    allEpisodes;

  // Auto-hide overlays on inactivity (4.5s)
  const wakeControls = useCallback(() => {
    setShowControls(true);
    window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
      setEpisodesMenuOpen(false);
    }, 4500);
  }, []);

  // Listen for mousemove and touch events to wake controls
  useEffect(() => {
    const handleActivity = () => wakeControls();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.clearTimeout(controlsTimeoutRef.current);
    };
  }, [wakeControls]);

  // Clickable player detection: when user clicks inside player iframe, window blurs to iframe
  useEffect(() => {
    const handleWindowBlur = () => {
      setTimeout(() => {
        if (document.activeElement === iframeRef.current) {
          setShowControls((prev) => {
            const next = !prev;
            if (next) wakeControls();
            return next;
          });
          try {
            window.focus();
          } catch { }
        }
      }, 60);
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [wakeControls]);

  // Sync fullscreen state with document fullscreenchange
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Track and save progress for continue watching with periodic updates
  useEffect(() => {
    if (!title) return;
    const existing = getProgress(title.id);
    let currentPos = existing?.position && existing.position > 60 ? existing.position : 300;
    const dur = (title.runtime || 120) * 60;

    // Initial save
    saveProgress({
      titleId: title.id,
      episodeId: activeEpisode?.id || existing?.episodeId,
      position: currentPos,
      duration: dur,
    });

    // Advance progress periodically while watch page is active
    const timer = window.setInterval(() => {
      currentPos += 15;
      if (currentPos > dur) currentPos = dur;
      saveProgress({
        titleId: title.id,
        episodeId: activeEpisode?.id || existing?.episodeId,
        position: currentPos,
        duration: dur,
      });
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [title?.id, activeEpisode?.id]);

  // Fullscreen toggle with landscape orientation lock if supported
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => { });
      try {
        if ('orientation' in screen && 'lock' in (screen.orientation as any)) {
          (screen.orientation as any).lock('landscape').catch(() => { });
        }
      } catch { }
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      try {
        if ('orientation' in screen && 'unlock' in (screen.orientation as any)) {
          (screen.orientation as any).unlock();
        }
      } catch { }
      setIsFullscreen(false);
    }
  };

  const handleNextEpisode = () => {
    if (nextEpisode) {
      const params = new URLSearchParams(searchParams);
      params.set('ep', nextEpisode.id);
      setSearchParams(params, { replace: true });
      setIframeKey((prev) => prev + 1);
    }
  };

  const handleSelectEpisode = (ep: Episode) => {
    const params = new URLSearchParams(searchParams);
    params.set('ep', ep.id);
    setSearchParams(params, { replace: true });
    setEpisodesMenuOpen(false);
    setIframeKey((prev) => prev + 1);
  };

  const reloadIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  if (loadingTitle && !title) {
    return (
      <div className="watch-loading-screen">
        <div className="spinner" />
        <p>Loading title stream...</p>
      </div>
    );
  }

  if (!title) {
    return (
      <div className="watch-not-found">
        <h2>Title not found</h2>
        <button type="button" className="btn btn--play" onClick={() => navigate('/')}>
          Go to Home
        </button>
      </div>
    );
  }

  // Parse TMDB ID
  let tmdbId = title.tmdbId;
  if (!tmdbId && id) {
    const parts = id.split('-');
    tmdbId = parseInt(parts[1] || parts[0], 10);
  }
  if (!tmdbId) tmdbId = 157336; // Fallback to Interstellar

  // Build VidLink PRO embed URL
  const embedUrl = getVidlinkUrl(
    tmdbId,
    title.type,
    currentSeason,
    currentEpisodeNum,
    {
      primaryColor: 'e50914',
      secondaryColor: '141414',
      iconColor: 'ffffff',
      icons: 'vid',
      autoplay: true,
      nextbutton: true,
    },
  );

  return (
    <div
      ref={containerRef}
      className={`watch-container ${!showControls ? 'controls-hidden' : ''}`}
      onMouseMove={wakeControls}
      onTouchStart={wakeControls}
      onClick={(e) => {
        if (e.target === containerRef.current) {
          setShowControls((prev) => !prev);
          wakeControls();
        }
      }}
    >
      {/* Interactive Click-to-Toggle Player Overlay (covers video, leaves bottom 76px for scrubber) */}
      <div
        className="watch-player-click-overlay"
        onClick={(e) => {
          e.stopPropagation();
          setShowControls((prev) => {
            const next = !prev;
            if (next) wakeControls();
            return next;
          });
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          toggleFullscreen();
        }}
        aria-label="Toggle Player Controls"
      />

      {/* Embedded Stream Player (VidLink PRO) */}
      <div className="watch-iframe-wrapper">
        <iframe
          ref={iframeRef}
          key={`${embedUrl}-${iframeKey}`}
          src={embedUrl}
          className="watch-iframe"
          title={`${title.name} Player`}
          allowFullScreen
          referrerPolicy="origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        />
      </div>

      {/* Floating Top Navigation Overlay */}
      <div
        className="watch-top-bar"
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('watch-title-info')) {
            setShowControls(false);
          }
        }}
      >
        <div className="watch-top-left">
          <button
            type="button"
            className="watch-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Back to browse"
            title="Back"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="watch-title-info">
            <span className="watch-main-title">{title.name}</span>
            {title.type === 'series' && (
              <span className="watch-sub-title">
                Season {currentSeason} • Episode {currentEpisodeNum}
                {activeEpisode?.name && activeEpisode.name !== `Episode ${currentEpisodeNum}`
                  ? ` · ${activeEpisode.name}`
                  : ''}
              </span>
            )}
          </div>
        </div>

        {/* Player Controls */}
        <div className="watch-top-right">
          {/* Reload Player Button */}
          <button
            type="button"
            className="watch-pill-btn watch-pill-btn--icon"
            onClick={reloadIframe}
            title="Reload Player"
            aria-label="Reload Player"
          >
            <RefreshCw size={16} />
          </button>



          {/* Episode List Trigger for Series */}
          {title.type === 'series' && (
            <div className="watch-menu-wrapper">
              <button
                type="button"
                className={`watch-pill-btn ${episodesMenuOpen ? 'watch-pill-btn--active' : ''}`}
                onClick={() => setEpisodesMenuOpen((prev) => !prev)}
                title="Select Episode"
                aria-label="Select Episode"
              >
                <ListVideo size={16} />
                <span className="pill-text">Episodes</span>
              </button>

              {episodesMenuOpen && (
                <>
                  <div
                    className="watch-episodes-backdrop"
                    onClick={() => setEpisodesMenuOpen(false)}
                  />
                  <div className="watch-menu watch-episodes-menu">
                    <div className="watch-episodes-header">
                      <div className="watch-episodes-handle" />
                      <div className="watch-episodes-title-row">
                        <div className="watch-episodes-season-controls">
                          <label htmlFor="watch-season-dropdown" className="watch-season-label">
                            Season
                          </label>
                          <div className="watch-season-dropdown-container">
                            <select
                              id="watch-season-dropdown"
                              className="watch-season-dropdown"
                              value={viewingSeason}
                              onChange={(e) => setViewingSeason(Number(e.target.value))}
                              aria-label="Select Season"
                            >
                              {seasons.map((s) => (
                                <option key={s.number} value={s.number} style={{ background: '#18181a', color: '#fff' }}>
                                  Season {s.number} ({s.episodes?.length || 0} Episodes)
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="watch-season-dropdown-chevron" />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="watch-episodes-close"
                          onClick={() => setEpisodesMenuOpen(false)}
                          aria-label="Close episodes"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Horizontal Quick Season Tabs */}
                      {seasons.length > 1 && (
                        <div className="watch-season-tabs">
                          {seasons.map((s) => (
                            <button
                              key={s.number}
                              type="button"
                              className={`watch-season-tab-btn ${viewingSeason === s.number ? 'active' : ''}`}
                              onClick={() => setViewingSeason(s.number)}
                            >
                              Season {s.number}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="watch-episodes-list">
                      {currentSeasonEpisodes.length > 0 ? (
                        currentSeasonEpisodes.map((ep) => (
                          <div
                            key={ep.id}
                            className={`watch-episode-item ${ep.season === currentSeason && ep.number === currentEpisodeNum ? 'active' : ''
                              }`}
                            onClick={() => handleSelectEpisode(ep)}
                          >
                            {ep.still ? (
                              <img src={ep.still} alt={ep.name} className="watch-episode-thumb" />
                            ) : (
                              <span className="ep-num">{ep.number}</span>
                            )}
                            <div className="ep-meta">
                              <span className="ep-name">
                                {ep.number}. {ep.name || `Episode ${ep.number}`}
                              </span>
                              <span className="ep-dur">Season {ep.season} • Episode {ep.number}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '0.75rem', color: 'var(--c-text-3)', fontSize: '0.85rem' }}>
                          No episodes found for Season {viewingSeason}.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Next Episode Button */}
          {nextEpisode && (
            <button
              type="button"
              className="watch-pill-btn watch-pill-btn--primary"
              onClick={handleNextEpisode}
              title={`Next Episode: ${nextEpisode.name}`}
            >
              <FastForward size={16} />
              <span className="pill-text">Next Ep</span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            className="watch-pill-btn watch-pill-btn--icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label="Fullscreen"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>

          {/* Toggle / Close Top Bar Button */}
          <button
            type="button"
            className="watch-pill-btn watch-pill-btn--icon"
            onClick={() => setShowControls(false)}
            title="Hide Controls Bar"
            aria-label="Hide Controls Bar"
          >
            <ChevronUp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
