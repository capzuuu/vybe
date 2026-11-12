import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor, SystemBars, type PluginListenerHandle } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { ScreenOrientation } from '@capacitor/screen-orientation';
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
import { reportWatchingActivity, clearWatchingActivity } from '../services/realtimeMonitorService';
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
  const isFullscreenRef = useRef(false);
  const saveProgressRef = useRef(saveProgress);
  saveProgressRef.current = saveProgress;

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

  const enterNativeFullscreen = useCallback(async () => {
    isFullscreenRef.current = true;
    setIsFullscreen(true);
    try {
      const current = await ScreenOrientation.orientation();
      const target =
        current.type === 'landscape-secondary' ? 'landscape-secondary' : 'landscape';
      await ScreenOrientation.lock({ orientation: target });
    } catch {
      await ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
    }
    await SystemBars.hide().catch(() => {});
  }, []);

  const exitNativeFullscreen = useCallback(async () => {
    isFullscreenRef.current = false;
    setIsFullscreen(false);
    await ScreenOrientation.unlock().catch(() => {});
    await SystemBars.show().catch(() => {});
  }, []);

  // Sync fullscreen state with document fullscreenchange (web) or hardware Back exit (native)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const handleExitFullscreen = () => {
        if (isFullscreenRef.current) {
          void exitNativeFullscreen();
        }
      };
      window.addEventListener('vybe:exit-fullscreen', handleExitFullscreen);
      return () => {
        window.removeEventListener('vybe:exit-fullscreen', handleExitFullscreen);
      };
    }

    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      isFullscreenRef.current = active;
      setIsFullscreen(active);
      if (!active) {
        try {
          if ('orientation' in screen && 'unlock' in (screen.orientation as any)) {
            (screen.orientation as any).unlock();
          }
        } catch { }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [exitNativeFullscreen]);

  // Restore orientation lock & system bars whenever leaving the Watch page
  useEffect(() => {
    return () => {
      if (Capacitor.isNativePlatform()) {
        isFullscreenRef.current = false;
        ScreenOrientation.unlock().catch(() => {});
        SystemBars.show().catch(() => {});
      }
    };
  }, []);

  // Close episodes menu when Escape key / Android back dismiss event fires
  useEffect(() => {
    if (!episodesMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEpisodesMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [episodesMenuOpen]);

  // Clear live watching presence when leaving /watch cleanly
  const activeTitleIdRef = useRef<string | undefined>(id);
  activeTitleIdRef.current = title?.id || id;
  useEffect(() => {
    return () => {
      clearWatchingActivity(activeTitleIdRef.current);
    };
  }, [id]);

  // Track and save progress (30s DB persistence + live telemetry sync + unmount/background flush)
  useEffect(() => {
    if (!title) return;
    const existing = getProgress(title.id);
    let currentPos = existing?.position && existing.position > 60 ? existing.position : 300;
    const runtimeMinutes =
      (title.type === 'series' ? activeEpisode?.duration : undefined) ||
      title.runtime ||
      (title.type === 'series' ? 48 : 115);
    const dur = Math.max(60, runtimeMinutes * 60);
    const episodeId = activeEpisode?.id || existing?.episodeId;
    const startedAt = new Date().toISOString();
    let lastTickAt = Date.now();
    let tickCount = 0;

    const pushLiveWatching = () => {
      reportWatchingActivity({
        titleId: title.id,
        titleName: title.name,
        titleType: title.type,
        poster: title.poster || title.backdrop || '',
        season: title.type === 'series' ? currentSeason : undefined,
        episode: title.type === 'series' ? currentEpisodeNum : undefined,
        episodeName: title.type === 'series' ? activeEpisode?.name : undefined,
        positionSec: currentPos,
        durationSec: dur,
        startedAt,
      });
    };

    const flush = (advanceElapsed: boolean) => {
      if (advanceElapsed) {
        const elapsedSec = Math.max(0, Math.round((Date.now() - lastTickAt) / 1000));
        lastTickAt = Date.now();
        currentPos = Math.min(dur, currentPos + elapsedSec);
      }
      saveProgressRef.current({
        titleId: title.id,
        episodeId,
        position: currentPos,
        duration: dur,
      });
      pushLiveWatching();
    };

    // Initial save + live broadcast
    flush(false);

    // Advance progress every 15s locally/live store; flush DB every 30s
    const timer = window.setInterval(() => {
      lastTickAt = Date.now();
      currentPos = Math.min(dur, currentPos + 15);
      tickCount += 1;
      if (tickCount % 2 === 0) {
        flush(false);
      } else {
        pushLiveWatching();
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush(true);
      } else {
        lastTickAt = Date.now();
        pushLiveWatching();
      }
    };
    const handlePageHide = () => flush(true);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('vybe:app-exit', handlePageHide);

    let disposed = false;
    let appStateHandle: PluginListenerHandle | null = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (disposed) return;
        if (!isActive) {
          flush(true);
        } else {
          lastTickAt = Date.now();
          pushLiveWatching();
        }
      })
        .then((handle) => {
          if (disposed) {
            void handle.remove();
          } else {
            appStateHandle = handle;
          }
        })
        .catch(() => {});
    }

    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('vybe:app-exit', handlePageHide);
      if (appStateHandle) {
        void appStateHandle.remove();
        appStateHandle = null;
      }
      if (document.visibilityState !== 'hidden') {
        const elapsedSec = Math.max(0, Math.round((Date.now() - lastTickAt) / 1000));
        currentPos = Math.min(dur, currentPos + elapsedSec);
      }
      saveProgressRef.current({
        titleId: title.id,
        episodeId,
        position: currentPos,
        duration: dur,
      });
    };
  }, [title?.id, activeEpisode?.id, currentSeason, currentEpisodeNum]);

  // Fullscreen toggle with native landscape orientation lock on Capacitor
  const toggleFullscreen = () => {
    if (Capacitor.isNativePlatform()) {
      if (isFullscreenRef.current) {
        void exitNativeFullscreen();
      } else {
        void enterNativeFullscreen();
      }
      return;
    }

    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => { });
      try {
        if ('orientation' in screen && 'lock' in (screen.orientation as any)) {
          (screen.orientation as any).lock('landscape').catch(() => { });
        }
      } catch { }
      isFullscreenRef.current = true;
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      try {
        if ('orientation' in screen && 'unlock' in (screen.orientation as any)) {
          (screen.orientation as any).unlock();
        }
      } catch { }
      isFullscreenRef.current = false;
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
      data-fullscreen={isFullscreen ? 'true' : undefined}
      className={`watch-container ${!showControls ? 'controls-hidden' : ''}`}
      onMouseMove={wakeControls}
      onTouchStart={wakeControls}
    >
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
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
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
                  <div className="watch-menu watch-episodes-menu" role="dialog" aria-label="Episodes">
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
