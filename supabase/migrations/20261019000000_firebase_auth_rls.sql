-- ====================================================================
-- ATC Platform: Firebase Auth + Supabase JWT Bridge Migration
-- File: supabase/migrations/20261019000000_firebase_auth_rls.sql
-- ====================================================================
-- In accordance with Option B (Firebase Auth + Supabase JWT Bridge):
-- 1. Foreign key from profiles.id -> auth.users is removed since Firebase Auth is single source of identity.
-- 2. profiles.id and user_id columns support TEXT Firebase UIDs.
-- 3. push_token and fcm_token columns added for push delivery.
-- 4. RLS policies evaluate auth.uid()::text matching Firebase UID.
-- ====================================================================

-- 1. Ensure push_token & fcm_token columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- 2. Drop foreign key constraint referencing auth.users if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

-- 3. Adjust ID columns to TEXT to seamlessly support Firebase UIDs
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.event_registrations ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.announcements ALTER COLUMN author_id TYPE TEXT;
ALTER TABLE public.events ALTER COLUMN author_id TYPE TEXT;
ALTER TABLE public.resources ALTER COLUMN author_id TYPE TEXT;
ALTER TABLE public.notifications_log ALTER COLUMN user_id TYPE TEXT;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR FIREBASE UID
-- ====================================================================

-- Profiles Policies
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin updates roles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid()::text = id OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid()::text = id);

CREATE POLICY "Super admin updates roles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text AND role = 'super_admin'
    )
  );

-- Announcements Policies
DROP POLICY IF EXISTS "Authenticated users read announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins write announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins delete announcements" ON public.announcements;

CREATE POLICY "Authenticated users read announcements"
  ON public.announcements FOR SELECT
  USING (true);

CREATE POLICY "Admins write announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins update announcements"
  ON public.announcements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins delete announcements"
  ON public.announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
      AND role IN ('admin', 'super_admin')
    )
  );

-- Events Policies
DROP POLICY IF EXISTS "Authenticated users read events" ON public.events;
DROP POLICY IF EXISTS "Admins write events" ON public.events;
DROP POLICY IF EXISTS "Admins update events" ON public.events;
DROP POLICY IF EXISTS "Admins delete events" ON public.events;

CREATE POLICY "Authenticated users read events"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Admins write events"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins update events"
  ON public.events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins delete events"
  ON public.events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
      AND role IN ('admin', 'super_admin')
    )
  );

-- Resources Policies
DROP POLICY IF EXISTS "Authenticated users read resources" ON public.resources;
DROP POLICY IF EXISTS "Admins write resources" ON public.resources;
DROP POLICY IF EXISTS "Admins delete resources" ON public.resources;

CREATE POLICY "Authenticated users read resources"
  ON public.resources FOR SELECT
  USING (true);

CREATE POLICY "Admins write resources"
  ON public.resources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins delete resources"
  ON public.resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
      AND role IN ('admin', 'super_admin')
    )
  );

-- Event Registrations Policies
DROP POLICY IF EXISTS "Users register themselves" ON public.event_registrations;
DROP POLICY IF EXISTS "Users delete own registration" ON public.event_registrations;
DROP POLICY IF EXISTS "Admins read registrations" ON public.event_registrations;

CREATE POLICY "Users register themselves"
  ON public.event_registrations FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users delete own registration"
  ON public.event_registrations FOR DELETE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Admins read registrations"
  ON public.event_registrations FOR SELECT
  USING (
    auth.uid()::text = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text
      AND role IN ('admin', 'super_admin')
    )
  );
