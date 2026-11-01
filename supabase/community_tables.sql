-- ══════════════════════════════════════════════════════════════════════════════
-- Vybe: Live Community & Social Features Schema
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Title Reviews & Ratings
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

-- 2. Curated Public Lists
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

-- 3. Recommendations Feed
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

-- 4. Episode Discussions & Debates
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

-- 5. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_title ON public.title_reviews(title_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON public.title_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_lists_popular ON public.public_lists(likes_count DESC) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_public_lists_created ON public.public_lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_recent ON public.recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_episode ON public.episode_discussions(title_id, season_num, episode_num, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_created ON public.episode_discussions(created_at DESC);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.title_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_discussions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Read Policies (Open for community discovery)
DROP POLICY IF EXISTS "Public reviews are readable by everyone" ON public.title_reviews;
CREATE POLICY "Public reviews are readable by everyone" ON public.title_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public lists are readable by everyone" ON public.public_lists;
CREATE POLICY "Public lists are readable by everyone" ON public.public_lists FOR SELECT USING (is_public = true OR (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Recommendations are readable by everyone" ON public.recommendations;
CREATE POLICY "Recommendations are readable by everyone" ON public.recommendations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Discussions are readable by everyone" ON public.episode_discussions;
CREATE POLICY "Discussions are readable by everyone" ON public.episode_discussions FOR SELECT USING (true);

-- 8. RLS Write Policies (Authenticated users insert, update & delete their own content)
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

-- 9. Atomic Like Adjustment Function (Safe, race-condition-free)
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

-- 10. Optional Starter Community Seed Data (Run if you want initial starter data directly in Supabase)
-- You can run this in your Supabase SQL editor to populate your database with real initial community items:
/*
INSERT INTO public.title_reviews (id, user_id, user_name, user_avatar, title_id, title_name, rating, review_title, content, contains_spoilers, likes_count)
VALUES
('rev-interstellar-1', '00000000-0000-0000-0000-000000000001', 'Elena Rostova', 1, 'movie-157336', 'Interstellar', 5, 'A transcendent masterpiece of modern science fiction', 'Hans Zimmer’s score combined with Hoyte van Hoytema’s 70mm cinematography creates an emotional and sensory journey unlike anything else. The tesseract sequence still gives me chills even on my fifth rewatch.', false, 48),
('rev-stranger-1', '00000000-0000-0000-0000-000000000002', 'Marcus Vance', 2, 'series-66732', 'Stranger Things', 5, 'Pure 80s nostalgia perfection with exceptional pacing', 'The Duffer Brothers captured lightning in a bottle. The synth soundtrack, the character dynamics, and the suspense make this one of the greatest modern television experiences.', false, 34)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.public_lists (id, user_id, user_name, user_avatar, title, description, is_public, title_ids, likes_count)
VALUES
('list-mind-bending-1', '00000000-0000-0000-0000-000000000001', 'Elena Rostova', 1, 'Mind-Bending Sci-Fi & Cosmic Horizons', 'Films that explore the boundaries of time, memory, space, and human consciousness.', true, ARRAY['movie-157336', 'movie-27205', 'movie-693134', 'movie-155'], 125)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.recommendations (id, user_id, user_name, user_avatar, title_id, title_name, title_backdrop, note, likes_count)
VALUES
('rec-interstellar-1', '00000000-0000-0000-0000-000000000001', 'Elena Rostova', 1, 'movie-157336', 'Interstellar', 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg', 'If you haven’t watched this with headphones or sound turned up, you are missing half the movie. Nolan’s best work!', 41)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.episode_discussions (id, user_id, user_name, user_avatar, title_id, title_name, season_num, episode_num, episode_name, comment, is_spoiler, likes_count)
VALUES
('disc-stranger-1', '00000000-0000-0000-0000-000000000002', 'Marcus Vance', 2, 'series-66732', 'Stranger Things', 1, 1, 'Chapter One: The Vanishing of Will Byers', 'That opening scene at the Hawkins National Laboratory instantly hooked me. The tension build-up with the flickering lights is unmatched.', false, 19)
ON CONFLICT (id) DO NOTHING;
*/
