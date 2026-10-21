-- Migration: 20261021010000_security_and_performance_indexes.sql
-- ATC Platform — Security, Performance & UX Implementation Plan: Database Optimization Layer
-- Creates high-performance B-tree indexes for rapid feed queries, upcoming event ordering,
-- leaderboard lookups, check-in deduplication, and RLS evaluation speed.

-- 1. Announcements Feed Index (Optimizes most frequent feed order: pinned DESC, created_at DESC)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_announcements_created_at
      ON public.announcements(created_at DESC);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'pinned'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_announcements_pinned_created
      ON public.announcements(pinned DESC, created_at DESC);
  END IF;
END $$;

-- 2. Events Start Date & Status Index (Optimizes upcoming workshop calendar queries)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_events_start_at
      ON public.events(start_at ASC);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'is_completed'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_events_is_completed
      ON public.events(is_completed);
  END IF;
END $$;

-- 3. Leaderboard XP & Ranking Index (Optimizes top-podium XP sorts and get_member_rank RPC)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'member_points' AND column_name = 'total_points'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_member_points_total
      ON public.member_points(total_points DESC);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'member_points' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_member_points_user_id
      ON public.member_points(user_id);
  END IF;
END $$;

-- 4. Event Check-ins Fast Lookup (Prevents duplicate scans and accelerates QR validation)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'event_checkins' AND column_name = 'event_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'event_checkins' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_event_checkins_event_user
      ON public.event_checkins(event_id, user_id);
  END IF;
END $$;

-- 5. Points Audit Log Lookup Index (Indexes awarded_at / created_at for fast audit trails)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'points_log' AND column_name = 'awarded_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_points_log_user_awarded
      ON public.points_log(user_id, awarded_at DESC);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'points_log' AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_points_log_user_created
      ON public.points_log(user_id, created_at DESC);
  END IF;
END $$;

-- 6. Contribution Reports Index (Optimizes Admin review queue)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contribution_reports' AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_contribution_reports_status_created
      ON public.contribution_reports(status, created_at DESC);
  END IF;
END $$;

-- 7. Form Submissions Index (For RSVP gate checks if form_submissions table is present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'form_submissions' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_form_submissions_user_event
      ON public.form_submissions(user_id, event_id, form_type);
  END IF;
END $$;
