import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim().slice(0, maxLength);
}

function isRealCloudUser(userId?: string | null): userId is string {
  return Boolean(userId && !userId.startsWith('demo-') && isSupabaseConfigured());
}

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeProfile } = useProfiles();
  const { showToast } = useToast();

  const [state, setState] = useState<CommunityStorageState>(() => loadCommunityState());
  const stateRef = useRef<CommunityStorageState>(state);
  stateRef.current = state;
  const pendingLikeIdsRef = useRef<Set<string>>(new Set());
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

  const activeUserName = sanitizeText(activeProfile?.name || user?.user_metadata?.name || 'Vybe Cinephile', 40) || 'Vybe Cinephile';
  const activeUserAvatar = Math.max(0, Math.min(20, Math.trunc(Number(activeProfile?.avatar) || 0)));

  // Helper to atomically adjust likes via hardened Supabase RPC (no direct table-overwrite bypass)
  const adjustLikesInSupabase = async (
    tableName: 'title_reviews' | 'public_lists' | 'recommendations' | 'episode_discussions',
    itemId: string,
    delta: 1 | -1
  ): Promise<void> => {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.rpc('adjust_community_likes', {
        item_table: tableName,
        item_id: itemId,
        delta,
      });
    } catch {
      // Keep local state resilient if offline
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

      const cleanTitle = sanitizeText(params.reviewTitle, 120);
      const cleanContent = sanitizeText(params.content, 2000);
      if (!cleanContent) {
        showToast('Please enter your review text before publishing.', { icon: 'info' });
        return false;
      }
      const clampedRating = Math.max(1, Math.min(5, Math.round(Number(params.rating) || 5)));

      const reviewId = crypto.randomUUID ? crypto.randomUUID() : `rev-${Date.now()}`;
      const newReview: UserReview = {
        id: reviewId,
        userId: user.id,
        userName: activeUserName,
        userAvatar: activeUserAvatar,
        titleId: params.titleId,
        titleName: sanitizeText(params.titleName, 160),
        rating: clampedRating,
        reviewTitle: cleanTitle,
        content: cleanContent,
        createdAt: 'Just now',
        likes: 0,
        isLikedByMe: false,
        containsSpoilers: Boolean(params.containsSpoilers),
      };

      const prevReviewsSnapshot = stateRef.current.reviews;

      // Optimistic update
      setState((prev) => ({
        ...prev,
        reviews: [newReview, ...prev.reviews.filter((r) => !(r.titleId === params.titleId && r.userId === user.id))],
      }));

      if (!isRealCloudUser(user.id)) {
        showToast(`Saved review locally for ${newReview.titleName} (demo mode).`, { icon: 'check' });
        return true;
      }

      const { error } = await supabase.from('title_reviews').insert({
        id: newReview.id,
        user_id: user.id,
        user_name: activeUserName,
        user_avatar: activeUserAvatar,
        title_id: newReview.titleId,
        title_name: newReview.titleName,
        rating: clampedRating,
        review_title: cleanTitle,
        content: cleanContent,
        contains_spoilers: newReview.containsSpoilers,
        likes_count: 0,
      });

      if (error) {
        console.error('[Community] Review insert error:', error);
        setState((prev) => ({ ...prev, reviews: prevReviewsSnapshot }));
        showToast(error.message || 'Failed to save review to Supabase', { icon: 'info' });
        return false;
      }

      showToast(`Review published for ${newReview.titleName}! ★ ${clampedRating}/5`, { icon: 'check' });
      return true;
    },
    [user?.id, activeUserName, activeUserAvatar, showToast]
  );

  // Like review (computes delta synchronously from stateRef to avoid React 18 batching race)
  const likeReview = useCallback(
    async (reviewId: string) => {
      if (pendingLikeIdsRef.current.has(reviewId)) return;
      pendingLikeIdsRef.current.add(reviewId);
      try {
        const currentlyLiked = stateRef.current.likedIds.includes(reviewId);
        const delta: 1 | -1 = currentlyLiked ? -1 : 1;

        setState((prev) => {
          const alreadyLiked = prev.likedIds.includes(reviewId);
          if (alreadyLiked !== currentlyLiked) return prev;
          return {
            ...prev,
            likedIds: currentlyLiked
              ? prev.likedIds.filter((id) => id !== reviewId)
              : [...prev.likedIds, reviewId],
            reviews: prev.reviews.map((r) =>
              r.id === reviewId
                ? { ...r, likes: Math.max(0, r.likes + delta), isLikedByMe: !currentlyLiked }
                : r
            ),
          };
        });

        await adjustLikesInSupabase('title_reviews', reviewId, delta);
      } finally {
        pendingLikeIdsRef.current.delete(reviewId);
      }
    },
    []
  );

  // Delete review
  const deleteReview = useCallback(
    async (reviewId: string) => {
      const prevReviews = stateRef.current.reviews;
      setState((prev) => ({
        ...prev,
        reviews: prev.reviews.filter((r) => r.id !== reviewId),
      }));

      if (isRealCloudUser(user?.id)) {
        const { error } = await supabase.from('title_reviews').delete().match({ id: reviewId, user_id: user.id });
        if (error) {
          setState((prev) => ({ ...prev, reviews: prevReviews }));
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

      const cleanTitle = sanitizeText(params.title, 100);
      if (!cleanTitle) {
        showToast('Please provide a title for your list.', { icon: 'info' });
        return false;
      }
      const cleanDesc = sanitizeText(params.description, 500);
      const cleanIds = Array.from(new Set(params.titleIds.filter((id) => typeof id === 'string' && id))).slice(0, 100);

      const listId = crypto.randomUUID ? crypto.randomUUID() : `list-${Date.now()}`;
      const newList: PublicList = {
        id: listId,
        userId: user.id,
        userName: activeUserName,
        userAvatar: activeUserAvatar,
        title: cleanTitle,
        description: cleanDesc,
        isPublic: Boolean(params.isPublic),
        titleIds: cleanIds,
        createdAt: 'Just now',
        likes: 0,
        isLikedByMe: false,
      };

      const prevLists = stateRef.current.lists;
      setState((prev) => ({
        ...prev,
        lists: [newList, ...prev.lists],
      }));

      if (!isRealCloudUser(user.id)) {
        showToast(`Custom list "${cleanTitle}" saved locally (demo mode).`, { icon: 'check' });
        return true;
      }

      const { error } = await supabase.from('public_lists').insert({
        id: newList.id,
        user_id: user.id,
        user_name: activeUserName,
        user_avatar: activeUserAvatar,
        title: cleanTitle,
        description: cleanDesc,
        is_public: newList.isPublic,
        title_ids: cleanIds,
        likes_count: 0,
      });

      if (error) {
        console.error('[Community] List insert error:', error);
        setState((prev) => ({ ...prev, lists: prevLists }));
        showToast(error.message || 'Failed to save list to Supabase', { icon: 'info' });
        return false;
      }

      showToast(`Custom list "${cleanTitle}" published! 🎬`, { icon: 'check' });
      return true;
    },
    [user?.id, activeUserName, activeUserAvatar, showToast]
  );

  // Like list
  const likeList = useCallback(
    async (listId: string) => {
      if (pendingLikeIdsRef.current.has(listId)) return;
      pendingLikeIdsRef.current.add(listId);
      try {
        const currentlyLiked = stateRef.current.likedIds.includes(listId);
        const delta: 1 | -1 = currentlyLiked ? -1 : 1;

        setState((prev) => {
          const alreadyLiked = prev.likedIds.includes(listId);
          if (alreadyLiked !== currentlyLiked) return prev;
          return {
            ...prev,
            likedIds: currentlyLiked
              ? prev.likedIds.filter((id) => id !== listId)
              : [...prev.likedIds, listId],
            lists: prev.lists.map((l) =>
              l.id === listId
                ? { ...l, likes: Math.max(0, l.likes + delta), isLikedByMe: !currentlyLiked }
                : l
            ),
          };
        });

        await adjustLikesInSupabase('public_lists', listId, delta);
      } finally {
        pendingLikeIdsRef.current.delete(listId);
      }
    },
    []
  );

  // Delete list
  const deleteList = useCallback(
    async (listId: string) => {
      const prevLists = stateRef.current.lists;
      setState((prev) => ({
        ...prev,
        lists: prev.lists.filter((l) => l.id !== listId),
      }));

      if (isRealCloudUser(user?.id)) {
        const { error } = await supabase.from('public_lists').delete().match({ id: listId, user_id: user.id });
        if (error) {
          setState((prev) => ({ ...prev, lists: prevLists }));
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

      const cleanNote = sanitizeText(params.note, 500);
      if (!cleanNote) {
        showToast('Please add a short recommendation note.', { icon: 'info' });
        return false;
      }

      const recId = crypto.randomUUID ? crypto.randomUUID() : `rec-${Date.now()}`;
      const newRec: Recommendation = {
        id: recId,
        userId: user.id,
        userName: activeUserName,
        userAvatar: activeUserAvatar,
        titleId: params.titleId,
        titleName: sanitizeText(params.titleName, 160),
        titleBackdrop: params.titleBackdrop,
        note: cleanNote,
        createdAt: 'Just now',
        likes: 0,
        isLikedByMe: false,
      };

      const prevRecs = stateRef.current.recommendations;
      setState((prev) => ({
        ...prev,
        recommendations: [newRec, ...prev.recommendations],
      }));

      if (!isRealCloudUser(user.id)) {
        showToast(`Recommended ${newRec.titleName} locally (demo mode).`, { icon: 'check' });
        return true;
      }

      const { error } = await supabase.from('recommendations').insert({
        id: newRec.id,
        user_id: user.id,
        user_name: activeUserName,
        user_avatar: activeUserAvatar,
        title_id: newRec.titleId,
        title_name: newRec.titleName,
        title_backdrop: params.titleBackdrop,
        note: cleanNote,
        likes_count: 0,
      });

      if (error) {
        console.error('[Community] Recommendation insert error:', error);
        setState((prev) => ({ ...prev, recommendations: prevRecs }));
        showToast(error.message || 'Failed to share recommendation to Supabase', { icon: 'info' });
        return false;
      }

      showToast(`Recommended ${newRec.titleName} to the community! 🍿`, { icon: 'check' });
      return true;
    },
    [user?.id, activeUserName, activeUserAvatar, showToast]
  );

  // Like recommendation
  const likeRecommendation = useCallback(
    async (recId: string) => {
      if (pendingLikeIdsRef.current.has(recId)) return;
      pendingLikeIdsRef.current.add(recId);
      try {
        const currentlyLiked = stateRef.current.likedIds.includes(recId);
        const delta: 1 | -1 = currentlyLiked ? -1 : 1;

        setState((prev) => {
          const alreadyLiked = prev.likedIds.includes(recId);
          if (alreadyLiked !== currentlyLiked) return prev;
          return {
            ...prev,
            likedIds: currentlyLiked
              ? prev.likedIds.filter((id) => id !== recId)
              : [...prev.likedIds, recId],
            recommendations: prev.recommendations.map((rec) =>
              rec.id === recId
                ? { ...rec, likes: Math.max(0, rec.likes + delta), isLikedByMe: !currentlyLiked }
                : rec
            ),
          };
        });

        await adjustLikesInSupabase('recommendations', recId, delta);
      } finally {
        pendingLikeIdsRef.current.delete(recId);
      }
    },
    []
  );

  // Delete recommendation
  const deleteRecommendation = useCallback(
    async (recId: string) => {
      const prevRecs = stateRef.current.recommendations;
      setState((prev) => ({
        ...prev,
        recommendations: prev.recommendations.filter((r) => r.id !== recId),
      }));

      if (isRealCloudUser(user?.id)) {
        const { error } = await supabase.from('recommendations').delete().match({ id: recId, user_id: user.id });
        if (error) {
          setState((prev) => ({ ...prev, recommendations: prevRecs }));
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

      const cleanComment = sanitizeText(params.comment, 1500);
      if (!cleanComment) {
        showToast('Please enter a comment before posting.', { icon: 'info' });
        return false;
      }

      const discId = crypto.randomUUID ? crypto.randomUUID() : `disc-${Date.now()}`;
      const newDisc: EpisodeDiscussion = {
        id: discId,
        userId: user.id,
        userName: activeUserName,
        userAvatar: activeUserAvatar,
        titleId: params.titleId,
        titleName: sanitizeText(params.titleName, 160),
        seasonNum: Math.max(1, Math.trunc(Number(params.seasonNum) || 1)),
        episodeNum: Math.max(1, Math.trunc(Number(params.episodeNum) || 1)),
        episodeName: sanitizeText(params.episodeName, 160),
        comment: cleanComment,
        createdAt: 'Just now',
        likes: 0,
        isLikedByMe: false,
        isSpoiler: Boolean(params.isSpoiler),
      };

      const prevDiscs = stateRef.current.discussions;
      setState((prev) => ({
        ...prev,
        discussions: [newDisc, ...prev.discussions],
      }));

      if (!isRealCloudUser(user.id)) {
        showToast(`Posted debate locally for S${newDisc.seasonNum}:E${newDisc.episodeNum} (demo mode).`, { icon: 'check' });
        return true;
      }

      const { error } = await supabase.from('episode_discussions').insert({
        id: newDisc.id,
        user_id: user.id,
        user_name: activeUserName,
        user_avatar: activeUserAvatar,
        title_id: newDisc.titleId,
        title_name: newDisc.titleName,
        season_num: newDisc.seasonNum,
        episode_num: newDisc.episodeNum,
        episode_name: newDisc.episodeName,
        comment: cleanComment,
        is_spoiler: newDisc.isSpoiler,
        likes_count: 0,
      });

      if (error) {
        console.error('[Community] Discussion insert error:', error);
        setState((prev) => ({ ...prev, discussions: prevDiscs }));
        showToast(error.message || 'Failed to post debate to Supabase', { icon: 'info' });
        return false;
      }

      showToast(`Posted debate for S${newDisc.seasonNum}:E${newDisc.episodeNum}! 💬`, { icon: 'check' });
      return true;
    },
    [user?.id, activeUserName, activeUserAvatar, showToast]
  );

  // Like discussion
  const likeDiscussion = useCallback(
    async (discId: string) => {
      if (pendingLikeIdsRef.current.has(discId)) return;
      pendingLikeIdsRef.current.add(discId);
      try {
        const currentlyLiked = stateRef.current.likedIds.includes(discId);
        const delta: 1 | -1 = currentlyLiked ? -1 : 1;

        setState((prev) => {
          const alreadyLiked = prev.likedIds.includes(discId);
          if (alreadyLiked !== currentlyLiked) return prev;
          return {
            ...prev,
            likedIds: currentlyLiked
              ? prev.likedIds.filter((id) => id !== discId)
              : [...prev.likedIds, discId],
            discussions: prev.discussions.map((d) =>
              d.id === discId
                ? { ...d, likes: Math.max(0, d.likes + delta), isLikedByMe: !currentlyLiked }
                : d
            ),
          };
        });

        await adjustLikesInSupabase('episode_discussions', discId, delta);
      } finally {
        pendingLikeIdsRef.current.delete(discId);
      }
    },
    []
  );

  // Delete discussion
  const deleteDiscussion = useCallback(
    async (discId: string) => {
      const prevDiscs = stateRef.current.discussions;
      setState((prev) => ({
        ...prev,
        discussions: prev.discussions.filter((d) => d.id !== discId),
      }));

      if (isRealCloudUser(user?.id)) {
        const { error } = await supabase.from('episode_discussions').delete().match({ id: discId, user_id: user.id });
        if (error) {
          setState((prev) => ({ ...prev, discussions: prevDiscs }));
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
