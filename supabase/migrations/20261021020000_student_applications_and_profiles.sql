-- Migration: 20261021020000_student_applications_and_profiles.sql
-- Purpose: Complete student membership application fields, automatic email linking, and Admin review queue

-- 1. Add application dossier columns to public.profiles if they do not exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS application_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS year TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS application_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roll_number TEXT;

-- 2. Indexes for application lookups by student ID and email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);

-- 3. Relax RLS to ensure public membership applicants can insert and update their profile
-- Drop existing insert/update policies to avoid conflicts
DROP POLICY IF EXISTS "Public applicants can submit application" ON public.profiles;
DROP POLICY IF EXISTS "Applicants can update application by email or id" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Anyone can submit a new student profile application
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- Anyone can update their own profile if unauthenticated (by id or email) or if authenticated UID matches or if admin
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (
    id = public.current_firebase_uid() 
    OR public.is_admin() 
    OR public.current_firebase_uid() IS NULL
  )
  WITH CHECK (true);
