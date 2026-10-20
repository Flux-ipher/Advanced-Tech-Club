-- =========================================================================
-- ADVANCED TECH CLUB (ATC) — MIGRATION 20261020000000
-- QR CODE EVENT CHECK-IN, GAMIFICATION ENGINE & ONBOARDING PROFILES
-- =========================================================================

-- 1. Profiles Table Onboarding Extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roll_number TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS year TEXT,
  ADD COLUMN IF NOT EXISTS why_join TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- 2. Event QR Codes Table
-- Note: created_by references profiles(id) which is TEXT (Firebase UID compatible)
CREATE TABLE IF NOT EXISTS public.event_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Event Checkins Table (Guarantees 1 Checkin per Member per Event)
CREATE TABLE IF NOT EXISTS public.event_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  qr_code_id UUID REFERENCES public.event_qr_codes(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- 4. Member Points Table
CREATE TABLE IF NOT EXISTS public.member_points (
  user_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  checkin_streak INTEGER DEFAULT 0,
  last_checkin_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Points Audit Log Table
CREATE TABLE IF NOT EXISTS public.points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Badges Catalog Table
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  points_required INTEGER,
  trigger TEXT,
  threshold INTEGER
);

-- 7. Member Badges Association Table
CREATE TABLE IF NOT EXISTS public.member_badges (
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- 8. Seed Default Badges
INSERT INTO public.badges (name, description, icon_url, points_required, trigger, threshold)
VALUES
  ('First Step', 'Attended your first club workshop or hackathon', '🏁', 50, 'checkin_count', 1),
  ('Regular', 'Attended 5 club events or technical deep-dives', '📅', 250, 'checkin_count', 5),
  ('Dedicated', 'Attended 10 campus engineering events', '⭐', 500, 'checkin_count', 10),
  ('Centurion', 'Earned 100 points across platform activities', '💯', 100, 'points_threshold', 100),
  ('Rising Star', 'Earned 300 points in campus workshops & challenges', '🚀', 300, 'points_threshold', 300),
  ('Club Legend', 'Achieved 1,000 engineering contribution points', '🏆', 1000, 'points_threshold', 1000),
  ('Resource Hunter', 'Downloaded 10 curriculum guides from the Vault', '📚', 50, 'resource_download', 10),
  ('On Fire', 'Maintained a 3-event consecutive check-in streak', '🔥', 150, 'streak', 3),
  ('Unstoppable', 'Maintained a 5-event consecutive check-in streak', '⚡', 250, 'streak', 5),
  ('Admin Contributor', 'Awarded to core student coordinators and builders', '🛠️', 0, 'manual', 0)
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  trigger = EXCLUDED.trigger,
  threshold = EXCLUDED.threshold;

-- 9. Member Rank RPC Function (Accepts TEXT member_id for Firebase UIDs)
CREATE OR REPLACE FUNCTION public.get_member_rank(member_id TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER + 1
  FROM public.member_points
  WHERE total_points > COALESCE(
    (SELECT total_points FROM public.member_points WHERE user_id = member_id),
    0
  );
$$ LANGUAGE SQL STABLE;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.event_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_badges ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies
-- QR Codes
DROP POLICY IF EXISTS "Authenticated can read QR codes" ON public.event_qr_codes;
CREATE POLICY "Authenticated can read QR codes"
  ON public.event_qr_codes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert QR codes" ON public.event_qr_codes;
CREATE POLICY "Admins can insert QR codes"
  ON public.event_qr_codes FOR ALL
  USING (true)
  WITH CHECK (true);

-- Event Checkins
DROP POLICY IF EXISTS "Members read own checkins" ON public.event_checkins;
CREATE POLICY "Members read own checkins"
  ON public.event_checkins FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Members can insert checkins" ON public.event_checkins;
CREATE POLICY "Members can insert checkins"
  ON public.event_checkins FOR ALL
  USING (true)
  WITH CHECK (true);

-- Member Points (Leaderboard readable by all authenticated / public users)
DROP POLICY IF EXISTS "Anyone can read member points" ON public.member_points;
CREATE POLICY "Anyone can read member points"
  ON public.member_points FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can upsert points" ON public.member_points;
CREATE POLICY "Users can upsert points"
  ON public.member_points FOR ALL
  USING (true)
  WITH CHECK (true);

-- Points Log
DROP POLICY IF EXISTS "Members read own points log" ON public.points_log;
CREATE POLICY "Members read own points log"
  ON public.points_log FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Members can insert points log" ON public.points_log;
CREATE POLICY "Members can insert points log"
  ON public.points_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- Badges
DROP POLICY IF EXISTS "Anyone can read badges" ON public.badges;
CREATE POLICY "Anyone can read badges"
  ON public.badges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can manage badges" ON public.badges;
CREATE POLICY "Anyone can manage badges"
  ON public.badges FOR ALL
  USING (true)
  WITH CHECK (true);

-- Member Badges
DROP POLICY IF EXISTS "Anyone can read member badges" ON public.member_badges;
CREATE POLICY "Anyone can read member badges"
  ON public.member_badges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Members can insert member badges" ON public.member_badges;
CREATE POLICY "Members can insert member badges"
  ON public.member_badges FOR ALL
  USING (true)
  WITH CHECK (true);

-- 12. Enable Realtime Replication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'member_points'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.member_points;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'member_badges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.member_badges;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'event_checkins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_checkins;
  END IF;
END $$;
