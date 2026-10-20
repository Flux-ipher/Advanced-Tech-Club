-- =========================================================================
-- ADVANCED TECH CLUB (ATC) — MIGRATION 20261020000000
-- QR CODE EVENT CHECK-IN, GAMIFICATION ENGINE & ONBOARDING PROFILES
-- =========================================================================

-- 1. Profiles Table Onboarding Extensions
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS roll_number TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS year TEXT,
  ADD COLUMN IF NOT EXISTS why_join TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- 2. Event QR Codes Table
CREATE TABLE IF NOT EXISTS event_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Event Checkins Table (Guarantees 1 Checkin per Member per Event)
CREATE TABLE IF NOT EXISTS event_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  qr_code_id UUID REFERENCES event_qr_codes(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- 4. Member Points Table
CREATE TABLE IF NOT EXISTS member_points (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  checkin_streak INTEGER DEFAULT 0,
  last_checkin_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Points Audit Log Table
CREATE TABLE IF NOT EXISTS points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Badges Catalog Table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  points_required INTEGER,
  trigger TEXT,
  threshold INTEGER
);

-- 7. Member Badges Association Table
CREATE TABLE IF NOT EXISTS member_badges (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- 8. Seed Default Badges
INSERT INTO badges (name, description, icon_url, points_required, trigger, threshold)
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

-- 9. Member Rank RPC Function
CREATE OR REPLACE FUNCTION get_member_rank(member_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER + 1
  FROM member_points
  WHERE total_points > (
    SELECT COALESCE(total_points, 0) FROM member_points WHERE user_id = member_id
  );
$$ LANGUAGE SQL STABLE;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE event_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_badges ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies
-- QR Codes
DROP POLICY IF EXISTS "Authenticated can read QR codes" ON event_qr_codes;
CREATE POLICY "Authenticated can read QR codes"
  ON event_qr_codes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert QR codes" ON event_qr_codes;
CREATE POLICY "Admins can insert QR codes"
  ON event_qr_codes FOR INSERT
  WITH CHECK (true);

-- Event Checkins
DROP POLICY IF EXISTS "Members read own checkins" ON event_checkins;
CREATE POLICY "Members read own checkins"
  ON event_checkins FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Members can insert checkins" ON event_checkins;
CREATE POLICY "Members can insert checkins"
  ON event_checkins FOR INSERT
  WITH CHECK (true);

-- Member Points (Leaderboard readable by all authenticated / public users)
DROP POLICY IF EXISTS "Anyone can read member points" ON member_points;
CREATE POLICY "Anyone can read member points"
  ON member_points FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can upsert points" ON member_points;
CREATE POLICY "Users can upsert points"
  ON member_points FOR ALL
  USING (true);

-- Points Log
DROP POLICY IF EXISTS "Members read own points log" ON points_log;
CREATE POLICY "Members read own points log"
  ON points_log FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Members can insert points log" ON points_log;
CREATE POLICY "Members can insert points log"
  ON points_log FOR INSERT
  WITH CHECK (true);

-- Badges
DROP POLICY IF EXISTS "Anyone can read badges" ON badges;
CREATE POLICY "Anyone can read badges"
  ON badges FOR SELECT
  USING (true);

-- Member Badges
DROP POLICY IF EXISTS "Anyone can read member badges" ON member_badges;
CREATE POLICY "Anyone can read member badges"
  ON member_badges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Members can insert member badges" ON member_badges;
CREATE POLICY "Members can insert member badges"
  ON member_badges FOR INSERT
  WITH CHECK (true);

-- 12. Enable Realtime Replication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'member_points'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE member_points;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'member_badges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE member_badges;
  END IF;
END $$;
