-- Migration: 20261107000000_add_event_author_and_metadata_columns.sql
-- Adds author_name, author_role, points, tags, date, image, registrations_count columns
-- to public.events table, updates category constraints, and reloads PostgREST schema cache.

-- 1. Add missing metadata columns to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT 'Club Admin';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS author_role TEXT DEFAULT 'Admin';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS points INT DEFAULT 50;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registrations_count INT DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- 2. Make author_id nullable with safe default fallback to prevent foreign key blocks
ALTER TABLE public.events ALTER COLUMN author_id DROP NOT NULL;

-- 3. Relax or expand category constraint to support all mobile & web category types
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'events_category_check' 
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events DROP CONSTRAINT events_category_check;
  END IF;
  
  ALTER TABLE public.events 
    ADD CONSTRAINT events_category_check 
    CHECK (category IN ('technical', 'workshop', 'hackathon', 'speaker_session', 'social', 'tech_talk', 'study_jam', 'general'));
END $$;

-- 4. Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
