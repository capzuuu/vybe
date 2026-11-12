-- ══════════════════════════════════════════════════════════════════════════════
-- Vybe Streaming Platform: Admin Monitoring, Single-Admin Gate & Supabase Realtime
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- Safe & idempotent: can be run on an existing Vybe database without data loss.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Single Designated Admin Account Table (Enforces max 1 admin row in DB)
CREATE TABLE IF NOT EXISTS public.admin_users (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_admin_users_email_nonempty CHECK (char_length(trim(email)) BETWEEN 3 AND 320)
);

-- 2. Registered Users Directory & Live Watch Heartbeat Mirror
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

-- 3. Indexes for Fast Admin Dashboard Queries & Telemetry Sorting
CREATE INDEX IF NOT EXISTS idx_user_directory_last_seen ON public.user_directory(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_directory_created ON public.user_directory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_directory_watching ON public.user_directory(last_seen_at DESC) WHERE is_watching = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_directory_online ON public.user_directory(last_seen_at DESC) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_library_recent_global ON public.user_library(updated_at DESC) WHERE position > 0;

-- 4. Enable Row Level Security (RLS) & Explicit Privileges
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_directory ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
REVOKE ALL ON TABLE public.admin_users FROM anon, authenticated;
GRANT SELECT ON TABLE public.admin_users TO authenticated;

REVOKE ALL ON TABLE public.user_directory FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_directory TO authenticated;

-- 5. RLS Policies for public.admin_users (Read own admin row only; mutations strictly SQL/service_role)
DROP POLICY IF EXISTS "Admin can read own admin record" ON public.admin_users;
CREATE POLICY "Admin can read own admin record"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- 6. RLS Policies for public.user_directory
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

-- 7. Update user_profiles & user_library SELECT Policies (Single SELECT policy per table: Owner OR Admin)
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

-- 8. Auth Sync Trigger: Keep public.user_directory synchronized with auth.users
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

-- 9. Backfill Existing Registered Users from auth.users into public.user_directory
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

-- 9b. Android APK Download Telemetry (Web Popup, Footer & Profile Menu)
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

-- 10. Enable Supabase Realtime Postgres Changes Publication for Admin Monitoring
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

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. REQUIRED ONE-TIME SETUP: Designate Your Single Admin Login
-- Replace 'admin@yourdomain.com' with the exact email of the 1 Supabase Auth
-- user allowed to sign into /admin, then uncomment and run this block:
-- ══════════════════════════════════════════════════════════════════════════════
/*
INSERT INTO public.admin_users (singleton, user_id, email)
SELECT TRUE, id, email
FROM auth.users
WHERE lower(email) = lower('admin@yourdomain.com')
LIMIT 1
ON CONFLICT (singleton) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    email = EXCLUDED.email,
    updated_at = NOW();
*/

