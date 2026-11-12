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

-- 5. Optimized RLS Policies for user_profiles using (SELECT auth.uid()) + TO authenticated
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.user_profiles;
CREATE POLICY "Users can view their own profiles"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.user_profiles;
CREATE POLICY "Users can insert their own profiles"
    ON public.user_profiles FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own profiles" ON public.user_profiles;
CREATE POLICY "Users can update their own profiles"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own profiles" ON public.user_profiles;
CREATE POLICY "Users can delete their own profiles"
    ON public.user_profiles FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- 6. Optimized RLS Policies for user_library using (SELECT auth.uid()) + TO authenticated
DROP POLICY IF EXISTS "Users can view their own library data" ON public.user_library;
CREATE POLICY "Users can view their own library data"
    ON public.user_library FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert into their own library" ON public.user_library;
CREATE POLICY "Users can insert into their own library"
    ON public.user_library FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own library data" ON public.user_library;
CREATE POLICY "Users can update their own library data"
    ON public.user_library FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own library data" ON public.user_library;
CREATE POLICY "Users can delete their own library data"
    ON public.user_library FOR DELETE
    TO authenticated
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

-- Write policies: Authenticated users can post/edit/delete only their own content
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.title_reviews;
CREATE POLICY "Users can insert their own reviews" ON public.title_reviews FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.title_reviews;
CREATE POLICY "Users can update their own reviews" ON public.title_reviews FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.title_reviews;
CREATE POLICY "Users can delete their own reviews" ON public.title_reviews FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own lists" ON public.public_lists;
CREATE POLICY "Users can insert their own lists" ON public.public_lists FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own lists" ON public.public_lists;
CREATE POLICY "Users can update their own lists" ON public.public_lists FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own lists" ON public.public_lists;
CREATE POLICY "Users can delete their own lists" ON public.public_lists FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert recommendations" ON public.recommendations;
CREATE POLICY "Users can insert recommendations" ON public.recommendations FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete recommendations" ON public.recommendations;
CREATE POLICY "Users can delete recommendations" ON public.recommendations FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert discussions" ON public.episode_discussions;
CREATE POLICY "Users can insert discussions" ON public.episode_discussions FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete discussions" ON public.episode_discussions;
CREATE POLICY "Users can delete discussions" ON public.episode_discussions FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Atomic Like Adjustment Function (Hardened: strict delta +1/-1 and non-empty id)
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
    IF delta NOT IN (-1, 1) THEN
        RAISE EXCEPTION 'Invalid like delta: must be -1 or 1';
    END IF;
    IF item_id IS NULL OR char_length(trim(item_id)) = 0 OR char_length(item_id) > 128 THEN
        RAISE EXCEPTION 'Invalid item_id';
    END IF;

    IF item_table = 'title_reviews' THEN
        UPDATE public.title_reviews SET likes_count = GREATEST(0, likes_count + delta) WHERE id = item_id;
    ELSIF item_table = 'public_lists' THEN
        UPDATE public.public_lists SET likes_count = GREATEST(0, likes_count + delta) WHERE id = item_id;
    ELSIF item_table = 'recommendations' THEN
        UPDATE public.recommendations SET likes_count = GREATEST(0, likes_count + delta) WHERE id = item_id;
    ELSIF item_table = 'episode_discussions' THEN
        UPDATE public.episode_discussions SET likes_count = GREATEST(0, likes_count + delta) WHERE id = item_id;
    ELSE
        RAISE EXCEPTION 'Unsupported table';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_community_likes(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_community_likes(TEXT, TEXT, INTEGER) TO anon;

-- Idempotent data integrity & length bounds (NOT VALID avoids breaking existing legacy rows while enforcing all new writes)
DO $$ BEGIN ALTER TABLE public.user_profiles ADD CONSTRAINT chk_user_profiles_name_len CHECK (char_length(name) BETWEEN 1 AND 50) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.user_library ADD CONSTRAINT chk_user_library_nonneg CHECK (position >= 0 AND duration >= 0) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.title_reviews ADD CONSTRAINT chk_title_reviews_len CHECK (char_length(content) BETWEEN 1 AND 2500 AND char_length(review_title) <= 160) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.public_lists ADD CONSTRAINT chk_public_lists_len CHECK (char_length(title) BETWEEN 1 AND 120 AND char_length(COALESCE(description, '')) <= 800 AND cardinality(title_ids) <= 200) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.recommendations ADD CONSTRAINT chk_recommendations_len CHECK (char_length(note) BETWEEN 1 AND 800) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.episode_discussions ADD CONSTRAINT chk_discussions_len CHECK (char_length(comment) BETWEEN 1 AND 2000 AND season_num >= 1 AND episode_num >= 1) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. Admin Dashboard Monitoring, Single-Admin Auth Gate & Supabase Realtime
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_users (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_admin_users_email_nonempty CHECK (char_length(trim(email)) BETWEEN 3 AND 320)
);

CREATE TABLE IF NOT EXISTS public.user_directory (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL DEFAULT '',
    full_name TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT 'email',
    active_profile_name TEXT,
    active_profile_avatar INTEGER NOT NULL DEFAULT 0,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    is_watching BOOLEAN NOT NULL DEFAULT FALSE,
    current_route TEXT NOT NULL DEFAULT '/',
    current_title_id TEXT,
    current_title_name TEXT,
    current_title_type TEXT,
    current_poster TEXT,
    current_season INTEGER,
    current_episode INTEGER,
    current_episode_name TEXT,
    current_position INTEGER NOT NULL DEFAULT 0,
    current_duration INTEGER NOT NULL DEFAULT 0,
    platform TEXT NOT NULL DEFAULT 'Desktop Web',
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_directory_progress CHECK (current_position >= 0 AND current_duration >= 0),
    CONSTRAINT chk_user_directory_season_ep CHECK (
        (current_season IS NULL OR current_season >= 1) AND
        (current_episode IS NULL OR current_episode >= 1)
    )
);

CREATE INDEX IF NOT EXISTS idx_user_directory_last_seen ON public.user_directory(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_directory_created ON public.user_directory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_directory_watching ON public.user_directory(last_seen_at DESC) WHERE is_watching = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_directory_online ON public.user_directory(last_seen_at DESC) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_library_recent_global ON public.user_library(updated_at DESC) WHERE position > 0;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_directory ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
REVOKE ALL ON TABLE public.admin_users FROM anon, authenticated;
GRANT SELECT ON TABLE public.admin_users TO authenticated;

REVOKE ALL ON TABLE public.user_directory FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_directory TO authenticated;

DROP POLICY IF EXISTS "Admin can read own admin record" ON public.admin_users;
CREATE POLICY "Admin can read own admin record"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users read own row or admin reads all" ON public.user_directory;
CREATE POLICY "Users read own row or admin reads all"
    ON public.user_directory FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id
        OR EXISTS (
            SELECT 1 FROM public.admin_users a
            WHERE a.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert their own directory row" ON public.user_directory;
CREATE POLICY "Users can insert their own directory row"
    ON public.user_directory FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own directory row" ON public.user_directory;
CREATE POLICY "Users can update their own directory row"
    ON public.user_directory FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users or admin can view profiles" ON public.user_profiles;
CREATE POLICY "Users or admin can view profiles"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id
        OR EXISTS (
            SELECT 1 FROM public.admin_users a
            WHERE a.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can view their own library data" ON public.user_library;
DROP POLICY IF EXISTS "Users or admin can view library data" ON public.user_library;
CREATE POLICY "Users or admin can view library data"
    ON public.user_library FOR SELECT
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id
        OR EXISTS (
            SELECT 1 FROM public.admin_users a
            WHERE a.user_id = (SELECT auth.uid())
        )
    );

CREATE OR REPLACE FUNCTION public.handle_auth_user_directory_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    derived_name TEXT;
    derived_provider TEXT;
BEGIN
    derived_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
        NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
        'Vybe Member'
    );
    derived_provider := COALESCE(
        NULLIF(TRIM(NEW.raw_app_meta_data ->> 'provider'), ''),
        'email'
    );

    INSERT INTO public.user_directory (
        user_id, email, full_name, provider, last_seen_at, created_at, updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        LEFT(derived_name, 80),
        LEFT(derived_provider, 32),
        COALESCE(NEW.last_sign_in_at, NEW.created_at, NOW()),
        COALESCE(NEW.created_at, NOW()),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE public.user_directory.email END,
        full_name = CASE WHEN public.user_directory.full_name = '' THEN EXCLUDED.full_name ELSE public.user_directory.full_name END,
        provider = EXCLUDED.provider,
        last_seen_at = GREATEST(public.user_directory.last_seen_at, COALESCE(NEW.last_sign_in_at, NOW())),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_auth_user_directory_sync failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_auth_user_directory_sync() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_directory_sync ON auth.users;
CREATE TRIGGER on_auth_user_directory_sync
    AFTER INSERT OR UPDATE OF email, last_sign_in_at, raw_app_meta_data ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_directory_sync();

INSERT INTO public.user_directory (
    user_id, email, full_name, provider, last_seen_at, created_at, updated_at
)
SELECT
    u.id,
    COALESCE(u.email, ''),
    LEFT(COALESCE(
        NULLIF(TRIM(u.raw_user_meta_data ->> 'full_name'), ''),
        NULLIF(TRIM(u.raw_user_meta_data ->> 'name'), ''),
        NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
        'Vybe Member'
    ), 80),
    LEFT(COALESCE(NULLIF(TRIM(u.raw_app_meta_data ->> 'provider'), ''), 'email'), 32),
    COALESCE(u.last_sign_in_at, u.created_at, NOW()),
    COALESCE(u.created_at, NOW()),
    NOW()
FROM auth.users u
ON CONFLICT (user_id) DO UPDATE SET
    email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE public.user_directory.email END,
    full_name = CASE WHEN public.user_directory.full_name = '' THEN EXCLUDED.full_name ELSE public.user_directory.full_name END,
    provider = EXCLUDED.provider;

CREATE TABLE IF NOT EXISTS public.apk_downloads (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    source TEXT NOT NULL DEFAULT 'unknown' CHECK (source IN ('popup', 'footer', 'profile_menu', 'direct', 'unknown')),
    platform TEXT NOT NULL DEFAULT 'Web',
    app_version TEXT NOT NULL DEFAULT '1.0',
    user_agent TEXT NOT NULL DEFAULT '',
    session_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_apk_downloads_platform_len CHECK (char_length(platform) <= 64),
    CONSTRAINT chk_apk_downloads_version_len CHECK (char_length(app_version) <= 32),
    CONSTRAINT chk_apk_downloads_ua_len CHECK (char_length(user_agent) <= 256),
    CONSTRAINT chk_apk_downloads_session_len CHECK (session_id IS NULL OR char_length(session_id) <= 128)
);

CREATE INDEX IF NOT EXISTS idx_apk_downloads_created ON public.apk_downloads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apk_downloads_source ON public.apk_downloads(source, created_at DESC);

ALTER TABLE public.apk_downloads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.apk_downloads FROM anon, authenticated;
GRANT SELECT ON TABLE public.apk_downloads TO authenticated;
GRANT INSERT (user_id, source, platform, app_version, user_agent, session_id)
    ON TABLE public.apk_downloads TO anon, authenticated;

DROP POLICY IF EXISTS "Visitors can log anonymous apk downloads" ON public.apk_downloads;
CREATE POLICY "Visitors can log anonymous apk downloads"
    ON public.apk_downloads FOR INSERT
    TO anon
    WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "Authenticated users can log own apk downloads" ON public.apk_downloads;
CREATE POLICY "Authenticated users can log own apk downloads"
    ON public.apk_downloads FOR INSERT
    TO authenticated
    WITH CHECK (user_id IS NULL OR (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admin can read all apk downloads" ON public.apk_downloads;
CREATE POLICY "Admin can read all apk downloads"
    ON public.apk_downloads FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users a
            WHERE a.user_id = (SELECT auth.uid())
        )
    );

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_directory'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_directory;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_library'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_library;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'apk_downloads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.apk_downloads;
    END IF;
END $$;

