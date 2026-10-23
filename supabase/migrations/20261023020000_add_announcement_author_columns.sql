-- =========================================================================
-- ADVANCED TECH CLUB (ATC) — MIGRATION 20261023020000
-- ADD AUTHOR METADATA COLUMNS TO PUBLIC.ANNOUNCEMENTS TABLE
-- =========================================================================

-- 1. Add author metadata columns to announcements table
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT 'Club Admin';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS author_role TEXT DEFAULT 'Admin';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS author_avatar TEXT;

-- 2. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
