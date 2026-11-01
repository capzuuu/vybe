import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Film,
  Star,
  MessageSquare,
  Share2,
  Heart,
  Plus,
  Compass,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Trash2,
  Tv,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCommunity } from '../contexts/CommunityContext';
import { useCatalog } from '../contexts/CatalogContext';
import { useDetails } from '../contexts/UIContext';
import { useToast } from '../contexts/ToastContext';
import { CreateListModal } from '../components/CreateListModal';
import { SelectTitleModal } from '../components/SelectTitleModal';
import { ReviewModal } from '../components/ReviewModal';
import { ShareRecommendModal } from '../components/ShareRecommendModal';
import type { CommunityTab } from '../types/community';
import type { Title } from '../types';
import './community.css';

export function CommunityPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    reviews,
    lists,
    recommendations,
    discussions,
    isLoading,
    refreshCommunity,
    likeReview,
    deleteReview,
    likeList,
    deleteList,
    likeRecommendation,
    deleteRecommendation,
    likeDiscussion,
    deleteDiscussion,
  } = useCommunity();

  const { titles, getTitle } = useCatalog();
  const { openDetails } = useDetails();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<CommunityTab>('feed');
  const [createListOpen, setCreateListOpen] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals for Title Selection -> Review / Recommend
  const [titlePickerOpen, setTitlePickerOpen] = useState<'review' | 'recommend' | null>(null);
  const [selectedTitleForReview, setSelectedTitleForReview] = useState<Title | null>(null);
  const [selectedTitleForRecommend, setSelectedTitleForRecommend] = useState<Title | null>(null);

  // Handle URL redirect with ?create=list
  useEffect(() => {
    if (searchParams.get('create') === 'list') {
      if (isAuthenticated) {
        setCreateListOpen(true);
        const next = new URLSearchParams(searchParams);
        next.delete('create');
        setSearchParams(next, { replace: true });
      }
    }
  }, [searchParams, isAuthenticated, setSearchParams]);

  const handleOpenCreateList = () => {
    if (!isAuthenticated) {
      showToast('Please sign in to create and share your public watchlist.', { icon: 'info' });
      navigate('/login', {
        state: {
          from: { pathname: '/community', search: '?create=list' },
        },
      });
      return;
    }
    setCreateListOpen(true);
  };

  const handleOpenWriteReview = () => {
    if (!isAuthenticated) {
      showToast('Please sign in to rate and review movies.', { icon: 'info' });
      navigate('/login');
      return;
    }
    setTitlePickerOpen('review');
  };

  const handleOpenRecommend = () => {
    if (!isAuthenticated) {
      showToast('Please sign in to share a movie recommendation.', { icon: 'info' });
      navigate('/login');
      return;
    }
    setTitlePickerOpen('recommend');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshCommunity();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Community feed updated from Supabase.', { icon: 'check' });
    }, 400);
  };

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="community-page">
      {/* Hero Header */}
      <div className="community-hero">
        <div>
          <h1 className="community-hero__title">Community</h1>
          <p className="community-hero__subtitle">
            Discover public watchlists, real viewer ratings, recommendations, and lively episode discussions.
          </p>
        </div>
        <div className="community-hero__actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleOpenCreateList}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} />
            <span>Create Public List</span>
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={handleOpenWriteReview}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Star size={15} />
            <span>Write Review</span>
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={handleOpenRecommend}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>Recommend Title</span>
          </button>
          <button
            type="button"
            className="circle-btn"
            onClick={handleRefresh}
            title="Refresh community feed"
            aria-label="Refresh community feed"
            style={{ width: '38px', height: '38px', flexShrink: 0 }}
          >
            <RotateCw size={16} className={isRefreshing || isLoading ? 'community-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Cinephiles removed) */}
      <div className="community-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'feed'}
          className={`community-tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          <Compass size={17} />
          <span>Activity Feed</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'lists'}
          className={`community-tab-btn ${activeTab === 'lists' ? 'active' : ''}`}
          onClick={() => setActiveTab('lists')}
        >
          <Film size={17} />
          <span>Curated Lists ({lists.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'reviews'}
          className={`community-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <Star size={17} />
          <span>Reviews &amp; Ratings ({reviews.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'debates'}
          className={`community-tab-btn ${activeTab === 'debates' ? 'active' : ''}`}
          onClick={() => setActiveTab('debates')}
        >
          <MessageSquare size={17} />
          <span>Episode Debates ({discussions.length})</span>
        </button>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="community-loading">
          <RotateCw size={28} className="community-spin" />
          <span>Loading live community from Supabase...</span>
        </div>
      )}

      {/* ── Tab 1: Activity Feed ────────────────────────────────────── */}
      {!isLoading && activeTab === 'feed' && (
        <>
          {recommendations.length === 0 && reviews.length === 0 ? (
            <div className="community-empty-state">
              <div className="community-empty-state__icon">
                <Compass size={28} />
              </div>
              <h3 className="community-empty-state__title">No Community Activity Yet</h3>
              <p className="community-empty-state__text">
                Be the first to share a recommendation or write a review for your favorite movies and series!
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button type="button" className="btn btn--primary btn--sm" onClick={handleOpenWriteReview}>
                  Write First Review
                </button>
                <button type="button" className="btn btn--secondary btn--sm" onClick={handleOpenRecommend}>
                  Recommend a Title
                </button>
              </div>
            </div>
          ) : (
            <div className="community-feed-grid">
              {/* Recommendations */}
              {recommendations.map((rec) => (
                <article key={rec.id} className="feed-card">
                  <div className="feed-card__header">
                    <div className="feed-card__user-info">
                      <div className="feed-card__avatar">{rec.userName.charAt(0)}</div>
                      <div className="feed-card__user-meta">
                        <span className="feed-card__user-name">{rec.userName}</span>
                        <span className="feed-card__timestamp">{rec.createdAt}</span>
                      </div>
                    </div>
                    <span className="feed-card__badge feed-card__badge--rec">Recommendation</span>
                  </div>

                  {/* Title Preview */}
                  <div
                    className="feed-card__title-preview"
                    onClick={() => openDetails(rec.titleId)}
                    title="Click to view title details"
                  >
                    {rec.titleBackdrop && (
                      <img src={rec.titleBackdrop} alt={rec.titleName} className="feed-card__title-thumb" />
                    )}
                    <div>
                      <div className="feed-card__title-name">{rec.titleName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#999' }}>Click to view details &amp; play</div>
                    </div>
                  </div>

                  <p className="feed-card__content">&ldquo;{rec.note}&rdquo;</p>

                  <div className="feed-card__actions">
                    <button
                      type="button"
                      className={`feed-action-btn ${rec.isLikedByMe ? 'active' : ''}`}
                      onClick={() => likeRecommendation(rec.id)}
                      aria-label="Like recommendation"
                    >
                      <Heart size={16} fill={rec.isLikedByMe ? '#e50914' : 'none'} />
                      <span>{rec.likes}</span>
                    </button>
                    <button
                      type="button"
                      className="feed-action-btn"
                      onClick={() => {
                        navigator.clipboard?.writeText?.(window.location.href);
                        showToast('Link copied to clipboard!', { icon: 'check' });
                      }}
                      aria-label="Share"
                    >
                      <Share2 size={15} />
                      <span>Share</span>
                    </button>
                    {user?.id && rec.userId === user.id && (
                      <button
                        type="button"
                        className="feed-action-btn"
                        onClick={() => deleteRecommendation(rec.id)}
                        title="Delete your recommendation"
                      >
                        <Trash2 size={15} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </article>
              ))}

              {/* Reviews in feed */}
              {reviews.map((rev) => (
                <article key={rev.id} className="feed-card">
                  <div className="feed-card__header">
                    <div className="feed-card__user-info">
                      <div className="feed-card__avatar">{rev.userName.charAt(0)}</div>
                      <div className="feed-card__user-meta">
                        <span className="feed-card__user-name">{rev.userName}</span>
                        <span className="feed-card__timestamp">{rev.createdAt}</span>
                      </div>
                    </div>
                    <span className="feed-card__badge feed-card__badge--review">Review</span>
                  </div>

                  <div className="feed-card__title-preview" onClick={() => openDetails(rev.titleId)}>
                    <div>
                      <div className="feed-card__title-name">{rev.titleName}</div>
                      <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
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
                  </div>

                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#fff' }}>{rev.reviewTitle}</h4>
                  <p className="feed-card__content">{rev.content}</p>

                  <div className="feed-card__actions">
                    <button
                      type="button"
                      className={`feed-action-btn ${rev.isLikedByMe ? 'active' : ''}`}
                      onClick={() => likeReview(rev.id)}
                      aria-label="Like review"
                    >
                      <Heart size={15} fill={rev.isLikedByMe ? '#e50914' : 'none'} />
                      <span>Helpful ({rev.likes})</span>
                    </button>
                    <button
                      type="button"
                      className="feed-action-btn"
                      onClick={() => {
                        navigator.clipboard?.writeText?.(window.location.href);
                        showToast('Link copied to clipboard!', { icon: 'check' });
                      }}
                      aria-label="Share"
                    >
                      <Share2 size={15} />
                      <span>Share</span>
                    </button>
                    {user?.id && rev.userId === user.id && (
                      <button
                        type="button"
                        className="feed-action-btn"
                        onClick={() => deleteReview(rev.id)}
                        title="Delete your review"
                      >
                        <Trash2 size={15} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab 2: Curated Lists ───────────────────────────────────── */}
      {!isLoading && activeTab === 'lists' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#fff' }}>
                Community Curated Watchlists
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--c-text-3)' }}>
                Discover collections curated by viewers or publish your own favorite themes.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={handleOpenCreateList}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} />
              <span>Create New List</span>
            </button>
          </div>

          {lists.length === 0 ? (
            <div className="community-empty-state">
              <div className="community-empty-state__icon">
                <Film size={28} />
              </div>
              <h3 className="community-empty-state__title">No Watchlists Published Yet</h3>
              <p className="community-empty-state__text">
                Build your themed collection of movies and TV series and share it with everyone on Vybe!
              </p>
              <button type="button" className="btn btn--primary btn--sm" onClick={handleOpenCreateList}>
                Create Public List
              </button>
            </div>
          ) : (
            <div className="community-lists-grid">
              {lists.map((list) => {
                const listTitles = list.titleIds.map((id) => getTitle(id)).filter(Boolean);

                return (
                  <div key={list.id} className="list-card">
                    <div>
                      {/* Poster strip preview */}
                      <div className="list-card__posters">
                        {listTitles.slice(0, 4).map((t, idx) => (
                          <img
                            key={t?.id || idx}
                            src={t?.backdrop || t?.poster}
                            alt={t?.name || 'Title'}
                            className="list-card__poster"
                            onClick={() => t?.id && openDetails(t.id)}
                            style={{ cursor: 'pointer' }}
                            title={t?.name}
                          />
                        ))}
                      </div>

                      <h3 className="list-card__title">{list.title}</h3>
                      <p className="list-card__desc">{list.description}</p>
                    </div>

                    <div className="list-card__footer">
                      <div>
                        <span>By <strong>{list.userName}</strong> &bull; {list.titleIds.length} titles</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className={`feed-action-btn ${list.isLikedByMe ? 'active' : ''}`}
                          onClick={() => likeList(list.id)}
                          aria-label="Like list"
                        >
                          <Heart size={15} fill={list.isLikedByMe ? '#e50914' : 'none'} />
                          <span>{list.likes}</span>
                        </button>
                        {user?.id && list.userId === user.id && (
                          <button
                            type="button"
                            className="feed-action-btn"
                            onClick={() => deleteList(list.id)}
                            title="Delete your list"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Tab 3: Reviews & Ratings ───────────────────────────────── */}
      {!isLoading && activeTab === 'reviews' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#fff' }}>
                Viewer Reviews &amp; Ratings
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--c-text-3)' }}>
                Honest ratings and critical reviews from community members.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={handleOpenWriteReview}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Star size={16} />
              <span>Write a Review</span>
            </button>
          </div>

          {reviews.length === 0 ? (
            <div className="community-empty-state">
              <div className="community-empty-state__icon">
                <Star size={28} />
              </div>
              <h3 className="community-empty-state__title">No Reviews Published Yet</h3>
              <p className="community-empty-state__text">
                Be the first to share your thoughts, theories, and ratings for movies and series in Vybe!
              </p>
              <button type="button" className="btn btn--primary btn--sm" onClick={handleOpenWriteReview}>
                Write First Review
              </button>
            </div>
          ) : (
            <div className="community-feed-grid">
              {reviews.map((rev) => {
                const titleObj = getTitle(rev.titleId);

                return (
                  <article key={rev.id} className="feed-card">
                    <div className="feed-card__header">
                      <div className="feed-card__user-info">
                        <div className="feed-card__avatar">{rev.userName.charAt(0)}</div>
                        <div className="feed-card__user-meta">
                          <span className="feed-card__user-name">{rev.userName}</span>
                          <span className="feed-card__timestamp">{rev.createdAt}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={16}
                              fill={s <= rev.rating ? '#ffb703' : 'none'}
                              color={s <= rev.rating ? '#ffb703' : '#555'}
                            />
                          ))}
                        </div>
                        <span style={{ fontWeight: 700, color: '#ffb703', fontSize: '0.9rem' }}>
                          {rev.rating}.0
                        </span>
                      </div>
                    </div>

                    <div
                      className="feed-card__title-preview"
                      onClick={() => openDetails(rev.titleId)}
                      title="Click to view details"
                    >
                      {titleObj?.backdrop && (
                        <img src={titleObj.backdrop} alt={rev.titleName} className="feed-card__title-thumb" />
                      )}
                      <div>
                        <div className="feed-card__title-name">{rev.titleName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#999' }}>Click to view title</div>
                      </div>
                    </div>

                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', color: '#fff' }}>
                      {rev.reviewTitle}
                    </h4>

                    {rev.containsSpoilers && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(229, 9, 20, 0.15)',
                          color: '#e50914',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          marginBottom: '0.5rem',
                        }}
                      >
                        <AlertTriangle size={13} />
                        <span>Contains Spoilers</span>
                      </div>
                    )}

                    <p className="feed-card__content">{rev.content}</p>

                    <div className="feed-card__actions">
                      <button
                        type="button"
                        className={`feed-action-btn ${rev.isLikedByMe ? 'active' : ''}`}
                        onClick={() => likeReview(rev.id)}
                        aria-label="Helpful review"
                      >
                        <Heart size={15} fill={rev.isLikedByMe ? '#e50914' : 'none'} />
                        <span>Helpful ({rev.likes})</span>
                      </button>
                      <button
                        type="button"
                        className="feed-action-btn"
                        onClick={() => {
                          navigator.clipboard?.writeText?.(window.location.href);
                          showToast('Link copied to clipboard!', { icon: 'check' });
                        }}
                        aria-label="Share"
                      >
                        <Share2 size={15} />
                        <span>Share</span>
                      </button>
                      {user?.id && rev.userId === user.id && (
                        <button
                          type="button"
                          className="feed-action-btn"
                          onClick={() => deleteReview(rev.id)}
                          title="Delete your review"
                        >
                          <Trash2 size={15} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Tab 4: Episode Debates ─────────────────────────────────── */}
      {!isLoading && activeTab === 'debates' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem', color: '#fff' }}>
                Episode Debates &amp; Fan Theories
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--c-text-3)' }}>
                Discuss cliffhangers and character arcs. Tap spoilers to reveal.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => navigate('/tv')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Tv size={16} />
              <span>Browse TV Shows to Debate</span>
            </button>
          </div>

          {discussions.length === 0 ? (
            <div className="community-empty-state">
              <div className="community-empty-state__icon">
                <MessageSquare size={28} />
              </div>
              <h3 className="community-empty-state__title">No Episode Debates Yet</h3>
              <p className="community-empty-state__text">
                Open any TV series and choose an episode to start a discussion or debate theories!
              </p>
              <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/tv')}>
                Browse TV Series
              </button>
            </div>
          ) : (
            discussions.map((disc) => {
              const isRevealed = revealedSpoilers[disc.id];

              return (
                <div key={disc.id} className="debate-box">
                  <div className="debate-box__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div className="feed-card__avatar" style={{ width: 34, height: 34, fontSize: '0.85rem' }}>
                        {disc.userName.charAt(0)}
                      </div>
                      <div>
                        <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{disc.userName}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{disc.createdAt}</div>
                      </div>
                    </div>
                    <span className="debate-box__tag">
                      {disc.titleName} &bull; S{disc.seasonNum}:E{disc.episodeNum}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#ffb703', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Episode: {disc.episodeName}
                  </div>

                  {disc.isSpoiler && !isRevealed ? (
                    <div
                      onClick={() => toggleSpoiler(disc.id)}
                      style={{
                        padding: '1rem',
                        background: '#222',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        color: '#bbb',
                        fontSize: '0.85rem',
                        border: '1px dashed rgba(229, 9, 20, 0.4)',
                      }}
                    >
                      <AlertTriangle size={16} color="#e50914" style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                      <strong>Spoiler Alert:</strong> Tap here to reveal discussion
                    </div>
                  ) : (
                    <p style={{ margin: '0 0 1rem', fontSize: '0.925rem', lineHeight: 1.5, color: '#e5e7eb' }}>
                      {disc.comment}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button
                        type="button"
                        className={`feed-action-btn ${disc.isLikedByMe ? 'active' : ''}`}
                        onClick={() => likeDiscussion(disc.id)}
                        aria-label="Upvote debate"
                      >
                        <Heart size={15} fill={disc.isLikedByMe ? '#e50914' : 'none'} />
                        <span>{disc.likes}</span>
                      </button>
                      <button
                        type="button"
                        className="feed-action-btn"
                        onClick={() => openDetails(disc.titleId)}
                      >
                        <Film size={15} />
                        <span>View Series</span>
                      </button>
                    </div>

                    {user?.id && disc.userId === user.id && (
                      <button
                        type="button"
                        className="feed-action-btn"
                        onClick={() => deleteDiscussion(disc.id)}
                        title="Delete your debate comment"
                      >
                        <Trash2 size={15} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Select Title Modal */}
      <SelectTitleModal
        isOpen={titlePickerOpen !== null}
        onClose={() => setTitlePickerOpen(null)}
        mode={titlePickerOpen || 'review'}
        onSelectTitle={(t) => {
          if (titlePickerOpen === 'review') {
            setSelectedTitleForReview(t);
          } else if (titlePickerOpen === 'recommend') {
            setSelectedTitleForRecommend(t);
          }
        }}
      />

      {/* Review Modal */}
      {selectedTitleForReview && (
        <ReviewModal
          title={selectedTitleForReview}
          isOpen={selectedTitleForReview !== null}
          onClose={() => setSelectedTitleForReview(null)}
        />
      )}

      {/* Recommend Modal */}
      {selectedTitleForRecommend && (
        <ShareRecommendModal
          title={selectedTitleForRecommend}
          isOpen={selectedTitleForRecommend !== null}
          onClose={() => setSelectedTitleForRecommend(null)}
        />
      )}

      {/* Create List Modal */}
      <CreateListModal
        isOpen={createListOpen}
        onClose={() => setCreateListOpen(false)}
      />
    </div>
  );
}
