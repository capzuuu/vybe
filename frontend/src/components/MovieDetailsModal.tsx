import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Plus, Check, ThumbsUp, Volume2, VolumeX, ChevronDown, Star, Share2, MessageSquare, Heart, AlertTriangle, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useDetails } from '../contexts/UIContext';
import { useCatalog } from '../contexts/CatalogContext';
import { useLibrary } from '../contexts/ProfileContext';
import { useCommunity } from '../contexts/CommunityContext';
import { usePlayTitle, useListToggle, useLikeToggle, useLockBodyScroll, useOnClickOutside } from '../hooks';
import { TitleArt } from './ui/TitleArt';
import { SmartImage } from './ui/SmartImage';
import { ReviewModal } from './ReviewModal';
import { ShareRecommendModal } from './ShareRecommendModal';
import { formatLength, formatRuntime } from '../utils/format';
import { similar, getTitleDetails } from '../services/catalogService';
import type { Episode, Season, Title, Trailer } from '../types';
import './modal.css';

export function MovieDetailsModal() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { detailsId, detailsTitle, closeDetails } = useDetails();
  const { titles, getTitle } = useCatalog();
  const { isInList, isLiked } = useLibrary();
  const { getTitleReviews, likeReview, getEpisodeDiscussions, addEpisodeDiscussion } = useCommunity();
  const playTitle = usePlayTitle();
  const toggleList = useListToggle();
  const toggleLike = useLikeToggle();

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [recommendModalOpen, setRecommendModalOpen] = useState(false);
  const [discussingEpisode, setDiscussingEpisode] = useState<Episode | null>(null);
  const [episodeComment, setEpisodeComment] = useState('');
  const [episodeSpoiler, setEpisodeSpoiler] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const baseTitle = detailsTitle || (detailsId ? getTitle(detailsId) : null);
  const [details, setDetails] = useState<Title | null>(null);
  const [loadingLiveDetails, setLoadingLiveDetails] = useState(false);
  const title = details || baseTitle;
  const isOpen = Boolean(detailsId);

  useLockBodyScroll(isOpen);
  useOnClickOutside(modalRef, closeDetails, isOpen);

  // Fetch full live TMDB details (cast, directors, trailers, seasons)
  useEffect(() => {
    if (!detailsId) {
      setDetails(null);
      return;
    }

    let tmdbId = baseTitle?.tmdbId;
    let type: 'movie' | 'series' = baseTitle?.type || 'movie';

    if (!tmdbId && detailsId) {
      const parts = detailsId.split('-');
      if (parts.length >= 2) {
        type = parts[0] === 'tv' || parts[0] === 'series' ? 'series' : 'movie';
        tmdbId = parseInt(parts[1], 10);
      }
    }

    if (tmdbId) {
      setLoadingLiveDetails(true);
      getTitleDetails(tmdbId, type)
        .then((full) => {
          setDetails(full);
        })
        .catch(() => {
          if (baseTitle) setDetails(baseTitle);
        })
        .finally(() => {
          setLoadingLiveDetails(false);
        });
    } else if (baseTitle) {
      setDetails(baseTitle);
    }
  }, [detailsId, baseTitle?.id]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetails();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeDetails]);

  // Reset season and start trailer after delay
  useEffect(() => {
    setSelectedSeason(1);
    setIsVideoReady(false);
    setIsPlayingTrailer(false);
    setIsSynopsisExpanded(false);
    if (title?.id && title?.videoUrl) {
      const timer = setTimeout(() => {
        setIsPlayingTrailer(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [title?.id, title?.videoUrl]);

  useEffect(() => {
    if (isPlayingTrailer && videoRef.current && title) {
      videoRef.current.currentTime = title.trailerStart || 0;
      videoRef.current.play().catch(() => {
        setIsVideoReady(false);
        setIsPlayingTrailer(false);
      });
    }
  }, [isPlayingTrailer, title?.id]);

  useEffect(() => {
    if (!isPlayingTrailer || isVideoReady) return;
    const stallTimer = window.setTimeout(() => {
      setIsVideoReady(false);
      setIsPlayingTrailer(false);
    }, 6000);
    return () => window.clearTimeout(stallTimer);
  }, [isPlayingTrailer, isVideoReady]);

  if (!isOpen) return null;

  if (!title) {
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true">
        <div
          ref={modalRef}
          className="modal-container"
          style={{ minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <button
            type="button"
            className="modal-close-btn circle-btn"
            onClick={closeDetails}
            aria-label="Close details"
          >
            <X size={20} />
          </button>
          <div className="spinner" style={{ width: 44, height: 44 }} />
        </div>
      </div>
    );
  }

  const inList = isInList(title.id);
  const liked = isLiked(title.id);
  const similarTitles = similar(titles, title, 6);
  const currentSeasonEpisodes =
    title.seasons?.find((s: Season) => s.number === selectedSeason)?.episodes || [];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div ref={modalRef} className="modal-container">
        {/* Close Button */}
        <button
          type="button"
          className="modal-close-btn circle-btn"
          onClick={closeDetails}
          aria-label="Close details"
        >
          <X size={20} />
        </button>

        {/* Top Hero Media */}
        <div className="modal-hero">
          <SmartImage
            src={title.backdrop}
            alt={title.name}
            className={`modal-hero__img ${isVideoReady ? 'hidden' : ''}`}
            eager
            fallbackLabel={title.name}
            accent={title.accent}
          />

          {isPlayingTrailer && title.videoUrl && (
            <video
              ref={videoRef}
              src={title.videoUrl}
              poster={title.backdrop}
              preload="auto"
              className={`modal-hero__video ${isVideoReady ? 'modal-hero__video--ready' : ''}`}
              autoPlay
              playsInline
              muted={isMuted}
              onPlaying={() => setIsVideoReady(true)}
              onError={() => {
                setIsVideoReady(false);
                setIsPlayingTrailer(false);
              }}
              onEnded={() => {
                setIsVideoReady(false);
                setIsPlayingTrailer(false);
              }}
            />
          )}

          <div className="modal-hero__gradient" />

          {/* Hero Overlay Info */}
          <div className="modal-hero__content">
            <TitleArt title={title} size="modal" as="h1" id="modal-title" />

            <div className="modal-hero__actions">
              <button
                type="button"
                className="btn btn--play"
                onClick={() => {
                  closeDetails();
                  playTitle(title);
                }}
              >
                <Play fill="currentColor" size={22} />
                <span>Play</span>
              </button>

              <button
                type="button"
                className={`circle-btn ${inList ? 'circle-btn--active' : ''}`}
                onClick={() => toggleList(title)}
                title={inList ? 'Remove from My List' : 'Add to My List'}
                aria-label={inList ? 'Remove from My List' : 'Add to My List'}
              >
                {inList ? <Check size={18} /> : <Plus size={18} />}
              </button>

              <button
                type="button"
                className={`circle-btn ${liked ? 'circle-btn--active' : ''}`}
                onClick={() => toggleLike(title)}
                title={liked ? 'Rated' : 'I like this'}
                aria-label="Like"
              >
                <ThumbsUp size={18} fill={liked ? 'currentColor' : 'none'} />
              </button>

              <button
                type="button"
                className="circle-btn"
                onClick={() => setReviewModalOpen(true)}
                title="Rate & Review"
                aria-label="Rate & Review"
              >
                <Star size={18} />
              </button>

              <button
                type="button"
                className="circle-btn"
                onClick={() => setRecommendModalOpen(true)}
                title="Recommend to Community"
                aria-label="Recommend to Community"
              >
                <Share2 size={18} />
              </button>

              {isVideoReady && (
                <button
                  type="button"
                  className="circle-btn modal-hero__mute"
                  onClick={() => setIsMuted((prev) => !prev)}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Metadata & Synopsis Split */}
          <div className="modal-info-grid">
            <div className="modal-info-left">
              <div className="modal-meta-row">
                <span className="match">{title.match}% Match</span>
                <span>{title.year}</span>
                <span className="maturity">{title.maturity}</span>
                <span>{formatLength(title)}</span>
                <span className="quality">{title.quality}</span>
              </div>

              <div className="modal-reasons">
                {title.maturityReasons.join(', ')}
              </div>

              <div className="modal-synopsis-container">
                <p className={`modal-synopsis ${!isSynopsisExpanded ? 'modal-synopsis--clamped' : ''}`}>
                  {title.synopsis}
                </p>
                {title.synopsis && title.synopsis.length > 180 && (
                  <button
                    type="button"
                    className="modal-synopsis-toggle"
                    onClick={() => setIsSynopsisExpanded((prev) => !prev)}
                    aria-expanded={isSynopsisExpanded}
                  >
                    <span>{isSynopsisExpanded ? 'See less' : 'See more'}</span>
                    <ChevronDown
                      size={14}
                      className={`synopsis-chevron ${isSynopsisExpanded ? 'rotated' : ''}`}
                    />
                  </button>
                )}
              </div>
            </div>

            <div className="modal-info-right">
              <div className="modal-crew-item">
                <span className="modal-crew-label">Cast: </span>
                <span className="modal-crew-value">{title.cast.slice(0, 4).join(', ')}</span>
              </div>

              <div className="modal-crew-item">
                <span className="modal-crew-label">Genres: </span>
                <span className="modal-crew-value">{title.genres.join(', ')}</span>
              </div>

              <div className="modal-crew-item">
                <span className="modal-crew-label">This title is: </span>
                <span className="modal-crew-value">{title.moods.join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Episode List (For Series) */}
          {title.type === 'series' && title.seasons && (
            <section className="modal-episodes-section">
              <div className="modal-episodes-header">
                <h2>Episodes</h2>
                {title.seasons.length > 1 && (
                  <select
                    className="select"
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                    aria-label="Select season"
                  >
                    {title.seasons.map((s: Season) => (
                      <option key={s.number} value={s.number}>
                        Season {s.number}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="modal-episodes-list">
                {currentSeasonEpisodes.map((ep: Episode) => (
                  <div
                    key={ep.id}
                    className="modal-episode-row"
                    onClick={() => {
                      closeDetails();
                      playTitle(title, ep.id);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Play Season ${ep.season} Episode ${ep.number}: ${ep.name}`}
                  >
                    <span className="modal-episode-num">{ep.number}</span>
                    <div className="modal-episode-thumb">
                      <SmartImage src={ep.still} alt={ep.name} />
                      <div className="modal-episode-play">
                        <Play size={20} fill="#fff" />
                      </div>
                    </div>
                    <div className="modal-episode-details">
                      <div className="modal-episode-title-row">
                        <span className="modal-episode-title">{ep.name}</span>
                        <span className="modal-episode-duration">{formatRuntime(ep.duration)}</span>
                      </div>
                      <p className="modal-episode-synopsis">{ep.synopsis}</p>
                    </div>
                    <button
                      type="button"
                      className="circle-btn"
                      style={{
                        marginLeft: 'auto',
                        flexShrink: 0,
                        width: 32,
                        height: 32,
                        background: 'rgba(255, 255, 255, 0.08)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDiscussingEpisode(ep);
                      }}
                      title={`Discuss S${ep.season}:E${ep.number}`}
                      aria-label={`Discuss S${ep.season}:E${ep.number}`}
                    >
                      <MessageSquare size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* More Like This */}
          {similarTitles.length > 0 && (
            <section className="modal-similar-section">
              <h2>More Like This</h2>
              <div className="modal-similar-grid">
                {similarTitles.map((sim) => {
                  const simInList = isInList(sim.id);
                  return (
                    <div key={sim.id} className="similar-card">
                      <div
                        className="similar-card__art"
                        onClick={() => {
                          closeDetails();
                          playTitle(sim);
                        }}
                      >
                        <SmartImage src={sim.backdrop} alt={sim.name} />
                        <span className="similar-card__duration">{formatLength(sim)}</span>
                        <div className="similar-card__play">
                          <Play size={24} fill="#fff" />
                        </div>
                      </div>
                      <div className="similar-card__info">
                        <div className="similar-card__meta">
                          <span className="match">{sim.match}% Match</span>
                          <span className="maturity">{sim.maturity}</span>
                          <button
                            type="button"
                            className={`circle-btn similar-card__add ${
                              simInList ? 'circle-btn--active' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleList(sim);
                            }}
                            title={simInList ? 'Remove from My List' : 'Add to My List'}
                            aria-label={simInList ? 'Remove from My List' : 'Add to My List'}
                          >
                            {simInList ? <Check size={16} /> : <Plus size={16} />}
                          </button>
                        </div>
                        <p className="similar-card__synopsis">{sim.synopsis}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Trailers & More */}
          {title.trailers.length > 0 && (
            <section className="modal-trailers-section">
              <h2>Trailers & More</h2>
              <div className="modal-trailers-grid">
                {title.trailers.map((tr: Trailer) => (
                  <div
                    key={tr.id}
                    className="trailer-card"
                    onClick={() => {
                      closeDetails();
                      playTitle(title);
                    }}
                  >
                    <div className="trailer-card__thumb">
                      <SmartImage src={tr.thumbnail} alt={tr.name} />
                      <div className="trailer-card__play">
                        <Play size={20} fill="#fff" />
                      </div>
                    </div>
                    <span className="trailer-card__name">{tr.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* About This Title */}
          <section className="modal-about-section">
            <h2>About <strong>{title.name}</strong></h2>
            <div className="modal-about-grid">
              <div>
                <span className="modal-crew-label">Creators / Director: </span>
                <span className="modal-crew-value">{title.creators.join(', ')}</span>
              </div>
              <div>
                <span className="modal-crew-label">Cast: </span>
                <span className="modal-crew-value">{title.cast.join(', ')}</span>
              </div>
              <div>
                <span className="modal-crew-label">Writers: </span>
                <span className="modal-crew-value">{title.writers.join(', ')}</span>
              </div>
              <div>
                <span className="modal-crew-label">Genres: </span>
                <span className="modal-crew-value">{title.genres.join(', ')}</span>
              </div>
              <div>
                <span className="modal-crew-label">This title is: </span>
                <span className="modal-crew-value">{title.moods.join(', ')}</span>
              </div>
              <div>
                <span className="modal-crew-label">Maturity Rating: </span>
                <span className="maturity">{title.maturity}</span>
                <span className="modal-crew-value" style={{ marginLeft: '0.5rem' }}>
                  Recommended for {title.maturity === 'ALL' ? 'all ages' : `ages ${title.maturity} and older`}
                </span>
              </div>
            </div>
          </section>

          {/* Community Reviews & Ratings */}
          <section className="modal-about-section" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.35rem', color: '#fff' }}>
                  Community Reviews &amp; Ratings
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffb703', fontSize: '0.9rem' }}>
                  <Star size={16} fill="#ffb703" />
                  <span style={{ fontWeight: 700 }}>
                    {getTitleReviews(title.id).length > 0
                      ? (getTitleReviews(title.id).reduce((acc, r) => acc + r.rating, 0) / getTitleReviews(title.id).length).toFixed(1)
                      : '5.0'} / 5.0
                  </span>
                  <span style={{ color: 'var(--c-text-3)' }}>({getTitleReviews(title.id).length} reviews)</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => {
                    if (!isAuthenticated) {
                      showToast('Please sign in to rate and review titles.', { icon: 'info' });
                      navigate('/login');
                      return;
                    }
                    setReviewModalOpen(true);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Star size={15} />
                  <span>Write Review</span>
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    if (!isAuthenticated) {
                      showToast('Please sign in to share a recommendation.', { icon: 'info' });
                      navigate('/login');
                      return;
                    }
                    setRecommendModalOpen(true);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Share2 size={15} />
                  <span>Recommend</span>
                </button>
              </div>
            </div>

            {getTitleReviews(title.id).length === 0 ? (
              <div style={{ padding: '1.5rem', background: '#1c1c1f', borderRadius: '10px', textAlign: 'center', color: '#888' }}>
                No reviews yet for this title. Be the first cinephile to share your thoughts!
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {getTitleReviews(title.id).map((rev) => (
                  <div
                    key={rev.id}
                    style={{
                      background: '#1c1c1f',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: '#2d2d32',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: '#fff',
                          }}
                        >
                          {rev.userName.charAt(0)}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{rev.userName}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '0.5rem' }}>{rev.createdAt}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            fill={s <= rev.rating ? '#ffb703' : 'none'}
                            color={s <= rev.rating ? '#ffb703' : '#555'}
                          />
                        ))}
                      </div>
                    </div>
                    <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', color: '#fff' }}>{rev.reviewTitle}</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#d1d5db', lineHeight: 1.5 }}>{rev.content}</p>
                    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => likeReview(rev.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: rev.isLikedByMe ? '#e50914' : '#888',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.8rem',
                          padding: 0,
                        }}
                      >
                        <Heart size={14} fill={rev.isLikedByMe ? '#e50914' : 'none'} />
                        <span>Helpful ({rev.likes})</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModalOpen && (
        <ReviewModal
          title={title}
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
        />
      )}

      {/* Share Recommend Modal */}
      {recommendModalOpen && (
        <ShareRecommendModal
          title={title}
          isOpen={recommendModalOpen}
          onClose={() => setRecommendModalOpen(false)}
        />
      )}

      {/* Episode Discussion Dialog */}
      {discussingEpisode && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div
            className="modal-container"
            style={{
              maxWidth: '540px',
              padding: '2rem',
              background: '#18181a',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <button
              type="button"
              className="modal-close-btn circle-btn"
              onClick={() => setDiscussingEpisode(null)}
              aria-label="Close"
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#ffb703', fontWeight: 600, textTransform: 'uppercase' }}>
                Episode Discussion
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0.2rem 0', color: '#fff' }}>
                S{discussingEpisode.season}:E{discussingEpisode.number} &bull; {discussingEpisode.name}
              </h2>
              <p style={{ margin: 0, color: 'var(--c-text-3)', fontSize: '0.85rem' }}>
                {title.name}
              </p>
            </div>

            {/* Existing comments for this episode */}
            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '1.25rem', display: 'grid', gap: '0.75rem' }}>
              {getEpisodeDiscussions(title.id, discussingEpisode.season, discussingEpisode.number).length === 0 ? (
                <div style={{ padding: '1rem', background: '#222', borderRadius: '8px', color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>
                  No discussion yet for this episode. Share your theories below!
                </div>
              ) : (
                getEpisodeDiscussions(title.id, discussingEpisode.season, discussingEpisode.number).map((disc) => (
                  <div key={disc.id} style={{ background: '#222', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <strong style={{ color: '#fff' }}>{disc.userName}</strong>
                      <span style={{ color: '#777', fontSize: '0.75rem' }}>{disc.createdAt}</span>
                    </div>
                    <p style={{ margin: 0, color: '#ccc', lineHeight: 1.4 }}>{disc.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!episodeComment.trim()) return;
                if (!isAuthenticated) {
                  showToast('Please sign in to join episode debates.', { icon: 'info' });
                  navigate('/login');
                  return;
                }
                addEpisodeDiscussion({
                  titleId: title.id,
                  titleName: title.name,
                  seasonNum: discussingEpisode.season,
                  episodeNum: discussingEpisode.number,
                  episodeName: discussingEpisode.name,
                  comment: episodeComment.trim().slice(0, 1000),
                  isSpoiler: episodeSpoiler,
                });
                setEpisodeComment('');
                setEpisodeSpoiler(false);
              }}
            >
              <textarea
                rows={3}
                required
                maxLength={1000}
                placeholder="What did you think of this episode? Share your theories or favorite scenes..."
                value={episodeComment}
                onChange={(e) => setEpisodeComment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: '#242426',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  lineHeight: 1.45,
                  boxSizing: 'border-box',
                  resize: 'none',
                  marginBottom: '0.75rem',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#aaa', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={episodeSpoiler}
                    onChange={(e) => setEpisodeSpoiler(e.target.checked)}
                    style={{ accentColor: '#e50914' }}
                  />
                  <span>Contains Spoilers</span>
                </label>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDiscussingEpisode(null)}>
                    Close
                  </button>
                  <button type="submit" className="btn btn--primary btn--sm" disabled={!episodeComment.trim()}>
                    <Send size={14} style={{ marginRight: '4px' }} />
                    <span>Post</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

