-- =========================================================================
-- ADVANCED TECH CLUB (ATC) — MIGRATION 20261022010000
-- LEADERBOARD RANK VISIBILITY & DYNAMIC CALCULATION FIX
-- =========================================================================

-- Update get_member_rank RPC function to:
-- 1. Return NULL if member is hidden from leaderboard (show_on_leaderboard = false)
-- 2. Strictly count only visible members with higher points so ranks shift up dynamically
-- 3. Execute with SECURITY DEFINER so regular members can compute ranks without RLS restrictions

CREATE OR REPLACE FUNCTION public.get_member_rank(member_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  is_visible BOOLEAN;
  member_pts INTEGER;
  computed_rank INTEGER;
BEGIN
  -- Check if the target member exists and their visibility status
  SELECT p.show_on_leaderboard, mp.total_points
  INTO is_visible, member_pts
  FROM public.profiles p
  LEFT JOIN public.member_points mp ON mp.user_id = p.id
  WHERE p.id = member_id;

  -- If member is not found or is explicitly hidden, rank is NULL
  IF NOT FOUND OR is_visible IS FALSE THEN
    RETURN NULL;
  END IF;

  member_pts := COALESCE(member_pts, 0);

  -- Count only visible members who have strictly more total_points
  SELECT COUNT(*)::INTEGER + 1
  INTO computed_rank
  FROM public.member_points mp
  JOIN public.profiles p ON p.id = mp.user_id
  WHERE (p.show_on_leaderboard IS NOT FALSE)
    AND mp.total_points > member_pts;

  RETURN computed_rank;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execution to all clients
GRANT EXECUTE ON FUNCTION public.get_member_rank(TEXT) TO anon, authenticated, service_role;
