import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useProfiles } from './ProfileContext';
import { useToast } from './ToastContext';
import {
  loadCommunityState,
  saveCommunityState,
  formatCommunityTime,
  type CommunityStorageState,
} from '../services/communityService';
import type {
  UserReview,
  EpisodeDiscussion,
  PublicList,
  Recommendation,
} from '../types/community';

interface CommunityContextType {
  reviews: UserReview[];
  lists: PublicList[];
  recommendations: Recommendation[];
  discussions: EpisodeDiscussion[];
  isLoading: boolean;
  refreshCommunity: () => Promise<void>;

  // Actions
  addReview: (params: {
    titleId: string;
    titleName: string;
    rating: number;
    reviewTitle: string;
    content: string;
    containsSpoilers: boolean;
  }) => Promise<boolean>;
  likeReview: (reviewId: string) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;

  createPublicList: (params: {
    title: string;
    description: string;
    titleIds: string[];
    isPublic: boolean;
  }) => Promise<boolean>;
  likeList: (listId: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;

  shareRecommendation: (params: {
    titleId: string;
    titleName: string;
    titleBackdrop?: string;
    note: string;
  }) => Promise<boolean>;
  likeRecommendation: (recId: string) => Promise<void>;
  deleteRecommendation: (recId: string) => Promise<void>;

  addEpisodeDiscussion: (params: {
    titleId: string;
    titleName: string;
    seasonNum: number;
    episodeNum: number;
    episodeName: string;
    comment: string;
    isSpoiler: boolean;
  }) => Promise<boolean>;
  likeDiscussion: (discussionId: string) => Promise<void>;
  deleteDiscussion: (discId: string) => Promise<void>;

  // Getters
  getTitleReviews: (titleId: string) => UserReview[];
  getUserTitleReview: (titleId: string) => UserReview | undefined;
  getEpisodeDiscussions: (titleId: string, seasonNum?: number, episodeNum?: number) => EpisodeDiscussion[];
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { activeProfile } = useProfiles();
  const { showToast } = useToast();

  const [state, setState] = useState<CommunityStorageState>(() => loadCommunityState());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Save to local storage cache on state change
  useEffect(() => {
    saveCommunityState(state);
  }, [state]);

  // Fetch real community content directly from Supabase
  const loadCloudCommunity = useCallback(async () => {
    setIsLoading(true);
    try {
      const [revRes, listRes, recRes, discRes] = await Promise.allSettled([
        supabase.from('title_reviews').select('*').order('created_at', { ascending: false }).limit(60),
        supabase.from('public_lists').select('*').order('created_at', { ascending: false }).limit(60),
        supabase.from('recommendations').select('*').order('created_at', { ascending: false }).limit(60),
        supabase.from('episode_discussions').select('*').order('created_at', { ascending: false }).limit(60),
      ]);

      setState((prev) => {
        const likedSet = new Set(prev.likedIds);
        let cloudReviews: UserReview[] = prev.reviews;
        let cloudLists: PublicList[] = prev.lists;
        let cloudRecs: Recommendation[] = prev.recommendations;
        let cloudDiscs: EpisodeDiscussion[] = prev.discussions;

        if (revRes.status === 'fulfilled' && revRes.value.data) {
          cloudReviews = revRes.value.data.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            userName: r.user_name || 'Vybe Cinephile',
            userAvatar: r.user_avatar ?? 0,
            titleId: r.title_id,
            titleName: r.title_name,
            rating: r.rating || 5,
            reviewTitle: r.review_title || '',
            content: r.content || '',
            createdAt: formatCommunityTime(r.created_at),
            likes: r.likes_count || 0,
            isLikedByMe: likedSet.has(r.id),
            containsSpoilers: Boolean(r.contains_spoilers),
          }));
        }

        if (listRes.status === 'fulfilled' && listRes.value.data) {
          cloudLists = listRes.value.data.map((l: any) => ({
            id: l.id,
            userId: l.user_id,
            userName: l.user_name || 'Vybe Cinephile',
            userAvatar: l.user_avatar ?? 0,
            title: l.title,
            description: l.description || '',
            isPublic: l.is_public ?? true,
            titleIds: Array.isArray(l.title_ids) ? l.title_ids : [],
            createdAt: formatCommunityTime(l.created_at),
            likes: l.likes_count || 0,
            isLikedByMe: likedSet.has(l.id),
          }));
        }

        if (recRes.status === 'fulfilled' && recRes.value.data) {
          cloudRecs = recRes.value.data.map((rec: any) => ({
            id: rec.id,
            userId: rec.user_id,
            userName: rec.user_name || 'Vybe Cinephile',
            userAvatar: rec.user_avatar ?? 0,
            titleId: rec.title_id,
            titleName: rec.title_name,
            titleBackdrop: rec.title_backdrop || undefined,
            note: rec.note || '',
            createdAt: formatCommunityTime(rec.created_at),
            likes: rec.likes_count || 0,
            isLikedByMe: likedSet.has(rec.id),
          }));
        }

        if (discRes.status === 'fulfilled' && discRes.value.data) {
          cloudDiscs = discRes.value.data.map((d: any) => ({
            id: d.id,
            userId: d.user_id,
            userName: d.user_name || 'Vybe Cinephile',
            userAvatar: d.user_avatar ?? 0,
            titleId: d.title_id,
            titleName: d.title_name,
            seasonNum: d.season_num,
            episodeNum: d.episode_num,
            episodeName: d.episode_name || `Episode ${d.episode_num}`,
            comment: d.comment || '',
            createdAt: formatCommunityTime(d.created_at),
            likes: d.likes_count || 0,
            isLikedByMe: likedSet.has(d.id),
            isSpoiler: Boolean(d.is_spoiler),
          }));
        }

        return {
          reviews: cloudReviews,
          lists: cloudLists,
          recommendations: cloudRecs,
          discussions: cloudDiscs,
          likedIds: prev.likedIds,
        };
      });
    } catch (err) {
      console.warn('[Community] Failed to sync with Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync on mount
  useEffect(() => {
    loadCloudCommunity();
  }, [loadCloudCommunity]);

  const activeUserName = activeProfile?.name || user?.user_metadata?.name || 'Vybe Cinephile';
  const activeUserAvatar = activeProfile?.avatar ?? 0;
  const activeUserId = user?.id || '';

  // Helper to adjust likes in Supabase
  const adjustLikesInSupabase = async (tableName: string, itemId: string, delta: number, nextCount: number) => {
    try {
      const { error: rpcError } = await supabase.rpc('adjust_community_likes', {
        item_table: tableName,
        item_id: itemId,
        delta,
      });

      if (rpcError) {
        // Fallback to direct table update
        await supabase
          .from(tableName)
          .update({ likes_count: nextCount })
          .eq('id', itemId);
      }
    } catch {
      // Graceful fallback to local optimistic state
    }
  };

  // Add review
  const addReview = useCallback(
    async (params: {
      titleId: string;
      titleName: string;
      rating: number;
      reviewTitle: string;
      content: string;
      containsSpoilers: boolean;
    }): Promise<boolean> => {
      if (!user?.id) {
        showToast('Please sign in to publish your review.', { icon: 'info' });
        return false;
      }

      const reviewId = crypto.randomUUID ? crypto.randomUUID() : `rev-${Date.now()}`;
      const newReview: UserReview = {
        id: reviewId,
        userId: user.id,
        userName: activeUserName,
        userAvatar: activeUserAvatar,
        titleId: params.titleId,
        titleName: params.titleName,
        rating: params.rating,
        reviewTitle: params.reviewTitle,
        content: params.content,
        createdAt: 'Just now',
        likes: 0,
        isLikedByMe: false,
        containsSpoilers: params.containsSpoilers,
      };

      // Optimistic update
      setState((prev) => ({
        ...prev,
        reviews: [newReview, ...prev.reviews.filter((r) => !(r.titleId === params.titleId && r.userId === user.id))],
      }));

      const { error } = await supabase.from('title_reviews').insert({
        id: newReview.id,
        user_id: user.id,
        user_name: activeUserName,
        user_avatar: activeUserAvatar,
        title_id: params.titleId,
        title_name: params.titleName,
        rating: params.rating,
        review_title: params.reviewTitle,
        content: params.content,
        contains_spoilers: params.containsSpoilers,
        likes_count: 0,
      });

      if (error) {
        console.error('[Community] Review insert error:', error);
        showToast(error.message || 'Failed to save review to Supabase', { icon: 'info' });
        return false;
      }

      showToast(`Review published for ${params.titleName}! ★ ${params.rating}/5`, { icon: 'check' });
      return true;
    },
    [user?.id, activeUserName, activeUserAvatar, showToast]
  );

  // Like review
  const likeReview = useCallback(
    async (reviewId: string) => {
      let delta = 1;
      let nextCount = 1;

      setState((prev) => {
        const currentlyLiked = prev.likedIds.includes(reviewId);
        delta = currentlyLiked ? -1 : 1;
        const nextLikedIds = currentlyLiked
          ? prev.likedIds.filter((id) => id !== reviewId)
          : [...prev.likedIds, reviewId];

        const nextReviews = prev.reviews.map((r) => {
          if (r.id === reviewId) {
            nextCount = Math.max(0, r.likes + delta);
            return {
              ...r,
              likes: nextCount,
              isLikedByMe: !currentlyLiked,
            };
          }
          return r;
        });

        return {
          ...prev,
          likedIds: nextLikedIds,
          reviews: nextReviews,
        };
      });

      await adjustLikesInSupabase('title_reviews', reviewId, delta, nextCount);
    },
    []
  );

  // Delete review
  const deleteReview = useCallback(
    async (reviewId: string) => {
      setState((prev) => ({
        ...prev,
        reviews: prev.reviews.filter((r) => r.id !== reviewId),
      }));

      if (user?.id) {
        const { error } = await supabase.from('title_reviews').delete().match({ id: reviewId, user_id: user.id });
        if (error) {
          showToast('Failed to delete review: ' + error.message, { icon: 'info' });
          return;
        }
      }
      showToast('Review removed.', { icon: 'info' });
    },
    [user?.id, showToast]
  );

  // Create public list
  const createPublicList = useCallback(
    async (params: {
      title: string;
      description: string;
      titleIds: string[];
      isPublic: boolean;
    }): Promise<boolean> => {
      if (!user?.id) {
        showToast('Please sign in to publish your watchlist.', { icon: 'info' });
        return false;
      }

      const listId = crypto.randomUUID ? crypto.randomUUID() : `list-${Date.now()}`;
      const newList: PublicList = {
        id: listId,
        userId: user.id,
        userName: activeUserName,
        userAvatar: activeUserAvatar,
        title: params.title,
        description: params.description,
        isPublic: params.isPublic,
        titleIds: params.titleIds,
        createdAt: 'Just now',
        likes: 0,
        isLikedByMe: false,
      };

      // Optimistic update
      setState((prev) => ({
        ...prev,
        lists: [newList, ...prev.lists],
      }));

      const { error } = await supabase.from('public_lists').insert({
        id: newList.id,
        user_id: user.id,
        user_name: activeUserName,
        user_avatar: activeUserAvatar,
        title: params.title,
        description: params.description,
        is_public: params.isPublic,
        title_ids: params.titleIds,
        likes_count: 0,
      });

      if (error) {
        console.error('[Community] List insert error:', error);
        showToast(error.message || 'Failed to save list to Supabase', { icon: 'info' });
        return false;
      }

      showToast(`Custom list "${params.title}" published! 🎬`, { icon: 'check' });
      return true;
    },
    [user?.id, activeUserName, activeUserAvatar, showToast]
  );

  // Like list
  const likeList = useCallback(
    async (listId: string) => {
      let delta = 1;
      let nextCount = 1;

      setState((prev) => {
        const currentlyLiked = prev.likedIds.includes(listId);
        delta = currentlyLiked ? -1 : 1;
        const nextLikedIds = currentlyLiked
          ? prev.likedIds.filter((id) => id !== listId)
          : [...prev.likedIds, listId];

        const nextLists = prev.lists.map((l) => {
          if (l.id === listId) {
            nextCount = Math.max(0, l.likes + delta);
            return {
              ...l,
              likes: nextCount,
              isLikedByMe: !currentlyLiked,
            };
          }
          return l;
        });

        return {
          ...prev,
          likedIds: nextLikedIds,
          lists: nextLists,
        };
      });

      await adjustLikesInSupabase('public_lists', listId, delta, nextCount);
    },
    []
  );

  // Delete list
  const deleteList = useCallback(
    async (listId: string) => {
      setState((prev) => ({
        ...prev,
        lists: prev.lists.filter((l) => l.id !== listId),
      }));

      if (user?.id) {
        const { error } = await supabase.from('public_lists').delete().match({ id: listId, user_id: user.id });
        if (error) {
          showToast('Failed to delete list: ' + error.message, { icon: 'info' });
          return;
        }
      }
      showToast('List removed from community.', { icon: 'info' });
    },
    [user?.id, showToast]
  );

  // Share recommendation
  const shareRecommendation = useCallback(
    async (params: {
      titleId: string;
      titleName: string;
      titleBackdrop?: string;
      note: string;
    }): Promise<boolean> => {
      if (!user?.id) {
        showToast('Please sign in to share a recommendation.', { icon: 'info' });
        return false;
      }

      const recId = crypto.randomUUID ? crypto.randomUUID() : `rec-${Date.now()}`;
      const newRec: Recommendation = {
        id: recId,
        userId: user.id,
        userName: activeUserName,
        userAvatar: activeUserAvatar,
        titleId: params.titleId,
        titleName: params.titleName,
        titleBackdrop: params.titleBackdrop,
        note: params.note,
        createdAt: 'Just now',
        likes: 0,
        isLikedByMe: false,
      };

      // Optimistic update
      setState((prev) => ({
        ...prev,
        recommendations: [newRec, ...prev.recommendations],
      }));

      const { error } = await supabase.from('recommendations').insert({
        id: newRec.id,
        user_id: user.id,
        user_name: activeUserName,
        user_avatar: activeUserAvatar,
        title_id: params.titleId,
        title_name: params.titleName,
        title_backdrop: params.titleBackdrop,
        note: params.note,
        likes_count: 0,
      });

      if (error) {
        console.error('[Community] Recommendation insert error:', error);
        showToast(error.message || 'Failed to share recommendation to Supabase', { icon: 'info' });
        return false;
      }

      showToast(`Recommended ${params.titleName} to the community! 🍿`, { icon: 'check' });
      return true;
    },
    [user?.id, activeUserName, activeUserAvatar, showToast]
  );

  // Like recommendation
  const likeRecommendation = useCallback(
    async (recId: string) => {
      let delta = 1;
      let nextCount = 1;

      setState((prev) => {
        const currentlyLiked = prev.likedIds.includes(recId);
        delta = currentlyLiked ? -1 : 1;
        const nextLikedIds = currentlyLiked
          ? prev.likedIds.filter((id) => id !== recId)
          : [...prev.likedIds, recId];

        const nextRecs = prev.recommendations.map((rec) => {
          if (rec.id === recId) {
            nextCount = Math.max(0, rec.likes + delta);
            return {
              ...rec,
              likes: nextCount,
              isLikedByMe: !currentlyLiked,
            };
          }
          return rec;
        });

        return {
          ...prev,
          likedIds: nextLikedIds,
          recommendations: nextRecs,
        };
      });

      await adjustLikesInSupabase('recommendations', recId, delta, nextCount);
    },
    []
  );

  // Delete recommendation
  const deleteRecommendation = useCallback(
    async (recId: string) => {
      setState((prev) => ({
        ...prev,
        recommendations: prev.recommendations.filter((r) => r.id !== recId),
      }));

      if (user?.id) {
        const { error } = await supabase.from('recommendations').delete().match({ id: recId, user_id: user.id });
        if (error) {
          showToast('Failed to delete recommendation: ' + error.message, { icon: 'info' });
          return;
        }
      }
      showToast('Recommendation removed.', { icon: 'info' });
    },
    [user?.id, showToast]
  );

  // Add episode discussion
  const addEpisodeDiscussion = useCallback(
    async (params: {
      titleId: string;
      titleName: string;
      seasonNum: number;
      episodeNum: number;
      episodeName: string;
      comment: string;
      isSpoiler: boolean;
    }): Promise<boolean> => {
      if (!user?.id) {
        showToast('Please sign in to join episode debates.', { icon: 'info' });
        return false;
      }

      const discId = crypto.randomUUID ? crypto.randomUUID() : `disc-${Date.now()}`;
      const newDisc: EpisodeDiscussion = {
        id: discId,
        userId: user.id,
        userName: activeUserName,
        userAvatar: activeUserAvatar,
        titleId: params.titleId,
        titleName: params.titleName,
        seasonNum: params.seasonNum,
        episodeNum: params.episodeNum,
        episodeName: params.episodeName,
        comment: params.comment,
        createdAt: 'Just now',
        likes: 0,
        isLikedByMe: false,
        isSpoiler: params.isSpoiler,
      };

      // Optimistic update
      setState((prev) => ({
        ...prev,
        discussions: [newDisc, ...prev.discussions],
      }));

      const { error } = await supabase.from('episode_discussions').insert({
        id: newDisc.id,
        user_id: user.id,
        user_name: activeUserName,
        user_avatar: activeUserAvatar,
        title_id: params.titleId,
        title_name: params.titleName,
        season_num: params.seasonNum,
        episode_num: params.episodeNum,
        episode_name: params.episodeName,
        comment: params.comment,
        is_spoiler: params.isSpoiler,
        likes_count: 0,
      });

      if (error) {
        console.error('[Community] Discussion insert error:', error);
        showToast(error.message || 'Failed to post debate to Supabase', { icon: 'info' });
        return false;
      }

      showToast(`Posted debate for S${params.seasonNum}:E${params.episodeNum}! 💬`, { icon: 'check' });
      return true;
    },
    [user?.id, activeUserName, activeUserAvatar, showToast]
  );

  // Like discussion
  const likeDiscussion = useCallback(
    async (discId: string) => {
      let delta = 1;
      let nextCount = 1;

      setState((prev) => {
        const currentlyLiked = prev.likedIds.includes(discId);
        delta = currentlyLiked ? -1 : 1;
        const nextLikedIds = currentlyLiked
          ? prev.likedIds.filter((id) => id !== discId)
          : [...prev.likedIds, discId];

        const nextDiscs = prev.discussions.map((d) => {
          if (d.id === discId) {
            nextCount = Math.max(0, d.likes + delta);
            return {
              ...d,
              likes: nextCount,
              isLikedByMe: !currentlyLiked,
            };
          }
          return d;
        });

        return {
          ...prev,
          likedIds: nextLikedIds,
          discussions: nextDiscs,
        };
      });

      await adjustLikesInSupabase('episode_discussions', discId, delta, nextCount);
    },
    []
  );

  // Delete discussion
  const deleteDiscussion = useCallback(
    async (discId: string) => {
      setState((prev) => ({
        ...prev,
        discussions: prev.discussions.filter((d) => d.id !== discId),
      }));

      if (user?.id) {
        const { error } = await supabase.from('episode_discussions').delete().match({ id: discId, user_id: user.id });
        if (error) {
          showToast('Failed to delete debate: ' + error.message, { icon: 'info' });
          return;
        }
      }
      showToast('Debate comment removed.', { icon: 'info' });
    },
    [user?.id, showToast]
  );

  const getTitleReviews = useCallback(
    (titleId: string) => {
      return state.reviews.filter((r) => r.titleId === titleId);
    },
    [state.reviews]
  );

  const getUserTitleReview = useCallback(
    (titleId: string) => {
      if (!user?.id) return undefined;
      return state.reviews.find((r) => r.titleId === titleId && r.userId === user.id);
    },
    [state.reviews, user?.id]
  );

  const getEpisodeDiscussions = useCallback(
    (titleId: string, seasonNum?: number, episodeNum?: number) => {
      return state.discussions.filter((d) => {
        if (d.titleId !== titleId) return false;
        if (seasonNum !== undefined && d.seasonNum !== seasonNum) return false;
        if (episodeNum !== undefined && d.episodeNum !== episodeNum) return false;
        return true;
      });
    },
    [state.discussions]
  );

  const value = useMemo(
    () => ({
      reviews: state.reviews,
      lists: state.lists,
      recommendations: state.recommendations,
      discussions: state.discussions,
      isLoading,
      refreshCommunity: loadCloudCommunity,
      addReview,
      likeReview,
      deleteReview,
      createPublicList,
      likeList,
      deleteList,
      shareRecommendation,
      likeRecommendation,
      deleteRecommendation,
      addEpisodeDiscussion,
      likeDiscussion,
      deleteDiscussion,
      getTitleReviews,
      getUserTitleReview,
      getEpisodeDiscussions,
    }),
    [
      state.reviews,
      state.lists,
      state.recommendations,
      state.discussions,
      isLoading,
      loadCloudCommunity,
      addReview,
      likeReview,
      deleteReview,
      createPublicList,
      likeList,
      deleteList,
      shareRecommendation,
      likeRecommendation,
      deleteRecommendation,
      addEpisodeDiscussion,
      likeDiscussion,
      deleteDiscussion,
      getTitleReviews,
      getUserTitleReview,
      getEpisodeDiscussions,
    ]
  );

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return ctx;
}
