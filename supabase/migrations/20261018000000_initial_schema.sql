-- Advanced Tech Club (ATC) Schema Migration
-- Migration: 20261018000000_initial_schema.sql
-- Covers: profiles, announcements, events, event_registrations, resources, notifications_log, RLS, triggers & storage

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'super_admin')),
    push_token TEXT,
    avatar_url TEXT,
    department TEXT DEFAULT 'Computer Science & Engineering',
    student_id TEXT,
    bio TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    media_url TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'urgent', 'opportunity', 'workshop', 'hackathon')),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    banner_url TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    capacity INT DEFAULT 100,
    category TEXT DEFAULT 'technical' CHECK (category IN ('technical', 'workshop', 'hackathon', 'speaker_session', 'social')),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. EVENT REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.event_registrations (
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlisted', 'attended', 'cancelled')),
    PRIMARY KEY (event_id, user_id)
);

-- 5. RESOURCES TABLE
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_size TEXT,
    category TEXT NOT NULL DEFAULT 'Slides' CHECK (category IN ('Slides', 'Cheat Sheets', 'Code Samples', 'Documentation', 'Tools', 'Roadmaps')),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    download_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. NOTIFICATIONS LOG TABLE
CREATE TABLE IF NOT EXISTS public.notifications_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'event', 'system', 'role_change')),
    read BOOLEAN NOT NULL DEFAULT false,
    link_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- REALTIME REPLICATION
-- ====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications_log;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- Helper functions for role checking
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles are readable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  -- Prevent normal members and admins from escalating roles unless super_admin
  CASE 
    WHEN role IS DISTINCT FROM (SELECT role FROM public.profiles WHERE id = auth.uid()) THEN public.is_super_admin()
    ELSE true
  END
);

CREATE POLICY "Super admin can update any profile role"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_super_admin());

-- Announcements Policies
CREATE POLICY "Announcements are readable by all authenticated users"
ON public.announcements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and super admins can insert announcements"
ON public.announcements FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins and super admins can update announcements"
ON public.announcements FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins and super admins can delete announcements"
ON public.announcements FOR DELETE
TO authenticated
USING (public.is_admin());

-- Events Policies
CREATE POLICY "Events are readable by all authenticated users"
ON public.events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and super admins can create events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins and super admins can update events"
ON public.events FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins and super admins can delete events"
ON public.events FOR DELETE
TO authenticated
USING (public.is_admin());

-- Event Registrations Policies
CREATE POLICY "Users can view all event registrations"
ON public.event_registrations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can register themselves for events"
ON public.event_registrations FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel their own registration"
ON public.event_registrations FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- Resources Policies
CREATE POLICY "Resources are readable by all authenticated users"
ON public.resources FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert resources"
ON public.resources FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update resources"
ON public.resources FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete resources"
ON public.resources FOR DELETE
TO authenticated
USING (public.is_admin());

-- Notifications Log Policies
CREATE POLICY "Users can read their own notifications"
ON public.notifications_log FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can mark their own notifications as read"
ON public.notifications_log FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- ====================================================================
-- AUTH HOOK / SIGNUP TRIGGER
-- Automatically creates a profile row when a user signs up
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'member',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ====================================================================
-- STORAGE BUCKETS SETUP
-- ====================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('announcement-media', 'announcement-media', true),
  ('event-banners', 'event-banners', true),
  ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket access policies
CREATE POLICY "Public storage read"
ON storage.objects FOR SELECT
USING (bucket_id IN ('avatars', 'announcement-media', 'event-banners', 'resources'));

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Admins can upload media and banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('announcement-media', 'event-banners', 'resources') 
  AND public.is_admin()
);
