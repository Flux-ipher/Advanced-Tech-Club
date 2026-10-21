-- Migration: 20261021010000_security_and_performance_indexes.sql
-- ATC Platform — Security, Performance & UX Implementation Plan: Database Optimization Layer
-- Creates high-performance B-tree indexes for rapid feed queries, upcoming event ordering,
-- leaderboard lookups, check-in deduplication, and RLS evaluation speed.

-- 1. Announcements Feed Index (Optimizes most frequent feed order: pinned DESC, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_announcements_created_at
  ON public.announcements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_pinned_created
  ON public.announcements(pinned DESC, created_at DESC);

-- 2. Events Start Date Index (Optimizes upcoming workshop calendar queries)
CREATE INDEX IF NOT EXISTS idx_events_start_at
  ON public.events(start_at ASC);

CREATE INDEX IF NOT EXISTS idx_events_is_completed
  ON public.events(is_completed);

-- 3. Leaderboard XP & Ranking Index (Optimizes top-podium XP sorts and get_member_rank RPC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'member_points') THEN
    CREATE INDEX IF NOT EXISTS idx_member_points_total
      ON public.member_points(total_points DESC);
    CREATE INDEX IF NOT EXISTS idx_member_points_user_id
      ON public.member_points(user_id);
  END IF;
END $$;

-- 4. Event Check-ins Fast Lookup (Prevents duplicate scans and accelerates QR validation)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_checkins') THEN
    CREATE INDEX IF NOT EXISTS idx_event_checkins_event_user
      ON public.event_checkins(event_id, user_id);
  END IF;
END $$;

-- 5. Points Audit Log Lookup Index
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'points_log') THEN
    CREATE INDEX IF NOT EXISTS idx_points_log_user_created
      ON public.points_log(user_id, created_at DESC);
  END IF;
END $$;

-- 6. Form Submissions Index (For RSVP gate checks if form_submissions table is present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'form_submissions') THEN
    CREATE INDEX IF NOT EXISTS idx_form_submissions_user_event
      ON public.form_submissions(user_id, event_id, form_type);
  END IF;
END $$;
