-- ══════════════════════════════════════════════════════════════════════════════
-- Vybe Streaming Platform: High-Performance Profiles & User Library Schema
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Profiles Table (Who's Watching profiles per user)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar INTEGER NOT NULL DEFAULT 0,
    is_kids BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, id)
);

-- 2. User Library Table (My List, Recent Watch Progress & Likes per profile)
CREATE TABLE IF NOT EXISTS public.user_library (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL,
    title_id TEXT NOT NULL,
    in_watchlist BOOLEAN NOT NULL DEFAULT FALSE,
    is_liked BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,      -- Playback progress in seconds
    duration INTEGER NOT NULL DEFAULT 0,      -- Total runtime in seconds
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, profile_id, title_id)
);

-- 3. High-Performance Indexes for 0ms queries & high scalability
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_order ON public.user_profiles(user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_user_library_user_id ON public.user_library(user_id);
CREATE INDEX IF NOT EXISTS idx_user_library_user_profile ON public.user_library(user_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_user_library_recent ON public.user_library(user_id, profile_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_library_watchlist ON public.user_library(user_id, profile_id) WHERE in_watchlist = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_library_progress ON public.user_library(user_id, profile_id) WHERE position > 0;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_library ENABLE ROW LEVEL SECURITY;

-- 5. Optimized RLS Policies for user_profiles using (SELECT auth.uid()) for 10x faster evaluation
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.user_profiles;
CREATE POLICY "Users can view their own profiles"
    ON public.user_profiles FOR SELECT
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.user_profiles;
CREATE POLICY "Users can insert their own profiles"
    ON public.user_profiles FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own profiles" ON public.user_profiles;
CREATE POLICY "Users can update their own profiles"
    ON public.user_profiles FOR UPDATE
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own profiles" ON public.user_profiles;
CREATE POLICY "Users can delete their own profiles"
    ON public.user_profiles FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

-- 6. Optimized RLS Policies for user_library using (SELECT auth.uid()) for 10x faster evaluation
DROP POLICY IF EXISTS "Users can view their own library data" ON public.user_library;
CREATE POLICY "Users can view their own library data"
    ON public.user_library FOR SELECT
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert into their own library" ON public.user_library;
CREATE POLICY "Users can insert into their own library"
    ON public.user_library FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own library data" ON public.user_library;
CREATE POLICY "Users can update their own library data"
    ON public.user_library FOR UPDATE
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own library data" ON public.user_library;
CREATE POLICY "Users can delete their own library data"
    ON public.user_library FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. Community & Social Features Schema
-- ══════════════════════════════════════════════════════════════════════════════

-- Title Reviews & Ratings
CREATE TABLE IF NOT EXISTS public.title_reviews (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL DEFAULT 'Vybe Cinephile',
    user_avatar INTEGER NOT NULL DEFAULT 0,
    title_id TEXT NOT NULL,
    title_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    contains_spoilers BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Curated Public Lists
CREATE TABLE IF NOT EXISTS public.public_lists (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL DEFAULT 'Vybe Cinephile',
    user_avatar INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    title_ids TEXT[] NOT NULL DEFAULT '{}',
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recommendations Feed
CREATE TABLE IF NOT EXISTS public.recommendations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL DEFAULT 'Vybe Cinephile',
    user_avatar INTEGER NOT NULL DEFAULT 0,
    title_id TEXT NOT NULL,
    title_name TEXT NOT NULL,
    title_backdrop TEXT,
    note TEXT NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Episode Discussions & Debates
CREATE TABLE IF NOT EXISTS public.episode_discussions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL DEFAULT 'Vybe Cinephile',
    user_avatar INTEGER NOT NULL DEFAULT 0,
    title_id TEXT NOT NULL,
    title_name TEXT NOT NULL,
    season_num INTEGER NOT NULL DEFAULT 1,
    episode_num INTEGER NOT NULL DEFAULT 1,
    episode_name TEXT NOT NULL DEFAULT '',
    comment TEXT NOT NULL,
    is_spoiler BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast community queries
CREATE INDEX IF NOT EXISTS idx_reviews_title ON public.title_reviews(title_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON public.title_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_episode ON public.episode_discussions(title_id, season_num, episode_num, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_created ON public.episode_discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_lists_popular ON public.public_lists(likes_count DESC) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_public_lists_created ON public.public_lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_recent ON public.recommendations(created_at DESC);

-- Enable RLS for all community tables
ALTER TABLE public.title_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_discussions ENABLE ROW LEVEL SECURITY;

-- Read policies: Public for community discovery
DROP POLICY IF EXISTS "Public reviews are readable by everyone" ON public.title_reviews;
CREATE POLICY "Public reviews are readable by everyone" ON public.title_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public lists are readable by everyone" ON public.public_lists;
CREATE POLICY "Public lists are readable by everyone" ON public.public_lists FOR SELECT USING (is_public = true OR (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Recommendations are readable by everyone" ON public.recommendations;
CREATE POLICY "Recommendations are readable by everyone" ON public.recommendations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Discussions are readable by everyone" ON public.episode_discussions;
CREATE POLICY "Discussions are readable by everyone" ON public.episode_discussions FOR SELECT USING (true);

-- Write policies: Authenticated users can post/edit/delete their own content
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.title_reviews;
CREATE POLICY "Users can insert their own reviews" ON public.title_reviews FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.title_reviews;
CREATE POLICY "Users can update their own reviews" ON public.title_reviews FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.title_reviews;
CREATE POLICY "Users can delete their own reviews" ON public.title_reviews FOR DELETE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own lists" ON public.public_lists;
CREATE POLICY "Users can insert their own lists" ON public.public_lists FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own lists" ON public.public_lists;
CREATE POLICY "Users can update their own lists" ON public.public_lists FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own lists" ON public.public_lists;
CREATE POLICY "Users can delete their own lists" ON public.public_lists FOR DELETE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert recommendations" ON public.recommendations;
CREATE POLICY "Users can insert recommendations" ON public.recommendations FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete recommendations" ON public.recommendations;
CREATE POLICY "Users can delete recommendations" ON public.recommendations FOR DELETE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert discussions" ON public.episode_discussions;
CREATE POLICY "Users can insert discussions" ON public.episode_discussions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete discussions" ON public.episode_discussions;
CREATE POLICY "Users can delete discussions" ON public.episode_discussions FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Atomic Like Adjustment Function (Safe, race-condition-free)
CREATE OR REPLACE FUNCTION public.adjust_community_likes(
    item_table TEXT,
    item_id TEXT,
    delta INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF item_table = 'title_reviews' THEN
        UPDATE public.title_reviews SET likes_count = GREATEST(0, likes_count + delta) WHERE id = item_id;
    ELSIF item_table = 'public_lists' THEN
        UPDATE public.public_lists SET likes_count = GREATEST(0, likes_count + delta) WHERE id = item_id;
    ELSIF item_table = 'recommendations' THEN
        UPDATE public.recommendations SET likes_count = GREATEST(0, likes_count + delta) WHERE id = item_id;
    ELSIF item_table = 'episode_discussions' THEN
        UPDATE public.episode_discussions SET likes_count = GREATEST(0, likes_count + delta) WHERE id = item_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_community_likes(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_community_likes(TEXT, TEXT, INTEGER) TO anon;

