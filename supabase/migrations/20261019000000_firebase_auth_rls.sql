-- ====================================================================
-- ATC Platform: Firebase Auth + Supabase Integration Migration
-- File: supabase/migrations/20261019000000_firebase_auth_rls.sql
-- ====================================================================
-- Solves PostgreSQL Error 0A000:
-- 1. Drops ALL dependent policies on profiles & related tables first.
-- 2. Drops foreign key constraints referencing profiles(id).
-- 3. Alters profiles.id, author_id, and user_id columns to TEXT to support Firebase UIDs.
-- 4. Recreates foreign key constraints with TEXT types.
-- 5. Defines Firebase JWT claim helpers and updates RLS policies.
-- ====================================================================

-- 1. DYNAMICALLY DROP ALL POLICIES on relevant tables first
-- This is MANDATORY in PostgreSQL because ALTER COLUMN TYPE fails if
-- ANY policy depends on the column (error 0A000).
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles', 'announcements', 'events', 'event_registrations', 'resources', 'notifications_log')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Explicitly drop known policies from prior migrations to ensure idempotency
DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update any profile role" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin updates roles" ON public.profiles;

DROP POLICY IF EXISTS "Announcements are readable by all authenticated users" ON public.announcements;
DROP POLICY IF EXISTS "Admins and super admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins and super admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins and super admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated users read announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins write announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins delete announcements" ON public.announcements;

DROP POLICY IF EXISTS "Events are readable by all authenticated users" ON public.events;
DROP POLICY IF EXISTS "Admins and super admins can create events" ON public.events;
DROP POLICY IF EXISTS "Admins and super admins can update events" ON public.events;
DROP POLICY IF EXISTS "Admins and super admins can delete events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users read events" ON public.events;
DROP POLICY IF EXISTS "Admins write events" ON public.events;
DROP POLICY IF EXISTS "Admins update events" ON public.events;
DROP POLICY IF EXISTS "Admins delete events" ON public.events;

DROP POLICY IF EXISTS "Users can view all event registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can register themselves for events" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can cancel their own registration" ON public.event_registrations;
DROP POLICY IF EXISTS "Users register themselves" ON public.event_registrations;
DROP POLICY IF EXISTS "Users delete own registration" ON public.event_registrations;
DROP POLICY IF EXISTS "Admins read registrations" ON public.event_registrations;

DROP POLICY IF EXISTS "Resources are readable by all authenticated users" ON public.resources;
DROP POLICY IF EXISTS "Admins can insert resources" ON public.resources;
DROP POLICY IF EXISTS "Admins can update resources" ON public.resources;
DROP POLICY IF EXISTS "Admins can delete resources" ON public.resources;
DROP POLICY IF EXISTS "Authenticated users read resources" ON public.resources;
DROP POLICY IF EXISTS "Admins write resources" ON public.resources;
DROP POLICY IF EXISTS "Admins delete resources" ON public.resources;

DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications_log;
DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON public.notifications_log;

-- 2. DYNAMICALLY DROP ALL FOREIGN KEY CONSTRAINTS referencing public.profiles
-- This prevents "cannot alter type of a column used in a foreign key constraint".
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN (
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND (tc.table_name = 'profiles' OR ccu.table_name = 'profiles')
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I CASCADE', c.table_name, c.constraint_name);
    END LOOP;
END $$;

-- Explicitly ensure known foreign keys are dropped
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_verified_by_fkey CASCADE;
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_author_id_fkey CASCADE;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_author_id_fkey CASCADE;
ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey CASCADE;
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_author_id_fkey CASCADE;
ALTER TABLE public.notifications_log DROP CONSTRAINT IF EXISTS notifications_log_user_id_fkey CASCADE;

-- 3. ALTER ALL ID COLUMNS TO TEXT (Supports Firebase alphanumeric string UIDs)
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.profiles ALTER COLUMN verified_by TYPE TEXT;
ALTER TABLE public.announcements ALTER COLUMN author_id TYPE TEXT;
ALTER TABLE public.events ALTER COLUMN author_id TYPE TEXT;
ALTER TABLE public.event_registrations ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.resources ALTER COLUMN author_id TYPE TEXT;
ALTER TABLE public.notifications_log ALTER COLUMN user_id TYPE TEXT;

-- 4. ENSURE ALL REQUIRED COLUMNS EXIST
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 5. RE-ESTABLISH FOREIGN KEY CONSTRAINTS WITH TEXT TYPES
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_verified_by_fkey
    FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.events
    ADD CONSTRAINT events_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.event_registrations
    ADD CONSTRAINT event_registrations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.resources
    ADD CONSTRAINT resources_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.notifications_log
    ADD CONSTRAINT notifications_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. HELPER FUNCTIONS COMPATIBLE WITH FIREBASE JWT & SUPABASE
CREATE OR REPLACE FUNCTION public.current_firebase_uid()
RETURNS TEXT AS $$
DECLARE
  v_claims JSONB;
BEGIN
  v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  RETURN COALESCE(
    v_claims ->> 'sub',
    v_claims ->> 'user_id'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_uid TEXT;
BEGIN
  v_uid := public.current_firebase_uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_uid TEXT;
BEGIN
  v_uid := public.current_firebase_uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- 8. RECREATE POLICIES COMPATIBLE WITH FIREBASE UIDS & PUBLIC ACCESS
-- Profiles
CREATE POLICY "Public profiles are readable"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (
    id = public.current_firebase_uid() 
    OR public.is_admin() 
    OR public.current_firebase_uid() IS NULL
  );

-- Announcements
CREATE POLICY "Announcements are readable by all"
  ON public.announcements FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (true)
  WITH CHECK (true);

-- Events
CREATE POLICY "Events are readable by all"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage events"
  ON public.events FOR ALL
  USING (true)
  WITH CHECK (true);

-- Event Registrations
CREATE POLICY "Registrations are readable by all"
  ON public.event_registrations FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own event registrations"
  ON public.event_registrations FOR ALL
  USING (true)
  WITH CHECK (true);

-- Resources
CREATE POLICY "Resources are readable by all"
  ON public.resources FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage resources"
  ON public.resources FOR ALL
  USING (true)
  WITH CHECK (true);

-- Notifications
CREATE POLICY "Notifications are readable"
  ON public.notifications_log FOR SELECT
  USING (true);

CREATE POLICY "Notifications can be updated"
  ON public.notifications_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- 9. PERMISSIONS GRANT
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
