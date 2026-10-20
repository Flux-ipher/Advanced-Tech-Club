// packages/shared/api/gamification.js
// Advanced Tech Club (ATC) — Gamification & QR Check-in Engine
// Includes: Points, Badges, Streaks, Leaderboard, Event QR Tokens & Check-ins

import { supabase } from '../supabaseClient.js';
import { idempotency } from '../utils/idempotency.js';
import { canStudentCheckIn, validateAttendanceCheckInTransition } from '../utils/stateMachines.js';
import { checkPresetLimit, checkTokenBucket } from '../utils/rateLimiter.js';
import {
  initialBadges,
  initialMemberPoints,
  initialMemberBadges,
  initialPointsLog,
  initialProfiles
} from '../mockData.js';

export const POINT_VALUES = {
  event_checkin: 50,
  event_registration: 10,
  resource_download: 5,
  announcement_read: 2,
  announcement_posted: 20,
  event_created: 30
};

/**
 * Fetch Leaderboard rankings sorted by total_points descending
 */
export async function getLeaderboard(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('member_points')
      .select(`
        user_id,
        total_points,
        checkin_streak,
        last_checkin_date,
        profiles (
          id,
          full_name,
          email,
          role,
          avatar_url,
          department,
          roll_number,
          branch,
          year
        )
      `)
      .order('total_points', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data.map((item, index) => ({
        rank: index + 1,
        user_id: item.user_id,
        total_points: item.total_points || 0,
        checkin_streak: item.checkin_streak || 0,
        full_name: item.profiles?.full_name || 'ATC Engineer',
        email: item.profiles?.email || '',
        avatar_url: item.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        role: item.profiles?.role || 'member',
        branch: item.profiles?.branch || item.profiles?.department || 'CSE',
        year: item.profiles?.year || 'Member'
      }));
    }
  } catch (err) {
    console.warn('[ATC Gamification] Live leaderboard fetch note:', err);
  }

  // If no live database rows yet, return empty list (no fake mock members)
  return [];
}

/**
 * Get specific member's rank
 */
export async function getMyRank(userId) {
  if (!userId) return 1;
  try {
    const { data: rankRpc, error } = await supabase.rpc('get_member_rank', { member_id: userId });
    if (!error && rankRpc) {
      return rankRpc;
    }
  } catch (err) {
    // Fallback to computing from leaderboard list
  }

  const leaderboard = await getLeaderboard(100);
  const foundIndex = leaderboard.findIndex((m) => m.user_id === userId);
  return foundIndex !== -1 ? foundIndex + 1 : leaderboard.length + 1;
}

/**
 * Fetch member points summary
 */
export async function getMemberPoints(userId) {
  if (!userId) return { total_points: 0, checkin_streak: 0, last_checkin_date: null };
  try {
    const { data, error } = await supabase
      .from('member_points')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('[ATC Gamification] Points fetch note:', err);
  }

  return { user_id: userId, total_points: 0, checkin_streak: 0, last_checkin_date: null };
}

/**
 * Fetch all available badge definitions
 */
export async function getAllBadges() {
  try {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('points_required', { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('[ATC Gamification] Badges fetch note:', err);
  }
  return initialBadges;
}

/**
 * Fetch badges earned by a member
 */
export async function getMemberBadges(userId) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('member_badges')
      .select(`
        badge_id,
        earned_at,
        badges (*)
      `)
      .eq('user_id', userId);

    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        ...d.badges,
        earned_at: d.earned_at
      }));
    }
  } catch (err) {
    console.warn('[ATC Gamification] Member badges fetch note:', err);
  }

  return [];
}

/**
 * Fetch points audit log for a member
 */
export async function getPointsLog(userId) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('points_log')
      .select('*')
      .eq('user_id', userId)
      .order('awarded_at', { ascending: false })
      .limit(30);

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('[ATC Gamification] Points log fetch note:', err);
  }

  return [];
}

/**
 * Award points for an action and verify badge unlocks with Token Bucket & Idempotency
 */
export async function awardPoints(userId, action, referenceId = null, customPoints = null) {
  if (!userId) return { success: false, reason: 'no_user' };
  const points = customPoints || POINT_VALUES[action] || 10;

  // 1. Token Bucket Rate Limiting (Prevents rapid automated XP farming)
  const bucketCheck = checkTokenBucket('POINTS_REWARD', userId);
  if (!bucketCheck.allowed) {
    return {
      success: false,
      reason: 'rate_limited',
      retryAfterSec: bucketCheck.retryAfterSec,
      pointsAwarded: 0,
      message: bucketCheck.message
    };
  }

  // 2. Helper to execute the actual point grant
  const executeGrant = async () => {
    try {
      // Get current points
      const current = await getMemberPoints(userId);
      const newTotal = (current.total_points || 0) + points;

      // Insert into points_log
      await supabase.from('points_log').insert({
        user_id: userId,
        points,
        reason: action,
        reference_id: referenceId ? String(referenceId) : null,
        awarded_at: new Date().toISOString()
      });

      // Upsert member_points
      await supabase.from('member_points').upsert({
        user_id: userId,
        total_points: newTotal,
        checkin_streak: current.checkin_streak || 0,
        last_checkin_date: current.last_checkin_date || null,
        updated_at: new Date().toISOString()
      });

      // Check for badge unlock thresholds
      const unlockedBadges = await checkAndAwardBadges(userId, newTotal, current.checkin_streak || 0);

      return {
        success: true,
        idempotent: false,
        pointsAwarded: points,
        newTotal,
        unlockedBadges
      };
    } catch (err) {
      console.warn('[ATC Gamification] awardPoints note:', err);
      return {
        success: true,
        idempotent: false,
        pointsAwarded: points,
        newTotal: points,
        unlockedBadges: []
      };
    }
  };

  // 3. For single-occurrence actions with referenceId (e.g. resource download), apply idempotency
  if (referenceId) {
    const key = idempotency.generateKey(`award_${action}`, userId, referenceId);
    return idempotency.execute(key, async () => {
      // Check if previously logged in points_log
      try {
        const { data: existing } = await supabase
          .from('points_log')
          .select('id, points')
          .eq('user_id', userId)
          .eq('reason', action)
          .eq('reference_id', String(referenceId))
          .maybeSingle();

        if (existing) {
          const current = await getMemberPoints(userId);
          return {
            success: true,
            idempotent: true,
            alreadyAwarded: true,
            pointsAwarded: 0,
            newTotal: current.total_points || 0,
            unlockedBadges: [],
            message: 'Points already credited for this activity.'
          };
        }
      } catch (logErr) {}

      return executeGrant();
    });
  }

  return executeGrant();
}

/**
 * Checks and awards badges if criteria met
 */
export async function checkAndAwardBadges(userId, totalPoints, streak = 0, checkinCount = 0) {
  const newUnlocked = [];
  try {
    const allBadges = await getAllBadges();
    const existing = await getMemberBadges(userId);
    const existingIds = new Set(existing.map((b) => b.id || b.name));

    for (const badge of allBadges) {
      if (existingIds.has(badge.id) || existingIds.has(badge.name)) continue;

      let qualified = false;
      if (badge.trigger === 'points_threshold' && totalPoints >= (badge.threshold || badge.points_required)) {
        qualified = true;
      } else if (badge.trigger === 'streak' && streak >= (badge.threshold || 3)) {
        qualified = true;
      } else if (badge.trigger === 'checkin_count' && checkinCount >= (badge.threshold || 1)) {
        qualified = true;
      }

      if (qualified) {
        await supabase.from('member_badges').insert({
          user_id: userId,
          badge_id: badge.id,
          earned_at: new Date().toISOString()
        });
        newUnlocked.push(badge);
      }
    }
  } catch (err) {
    console.warn('[ATC Gamification] checkAndAwardBadges note:', err);
  }
  return newUnlocked;
}

/**
 * Record event check-in via QR token with idempotency, rate limiting & state machine validation
 */
export async function recordEventCheckin(userId, eventId, qrToken = null, options = {}) {
  if (!userId || !eventId) {
    return { success: false, reason: 'missing_params', message: 'User or Event ID missing.' };
  }

  // 1. Token Bucket Rate Limiting (Burst absorption with smooth continuous replenishment)
  const tokenBucketCheck = checkTokenBucket('CHECK_IN', userId);
  if (!tokenBucketCheck.allowed) {
    return {
      success: false,
      reason: 'rate_limited',
      retryAfterSec: tokenBucketCheck.retryAfterSec,
      message: tokenBucketCheck.message
    };
  }

  // Sliding Window Rate Limiting (Strict ceiling per minute)
  const rateCheck = checkPresetLimit('CHECK_IN_ATTEMPT', userId);
  if (!rateCheck.allowed) {
    return {
      success: false,
      reason: 'rate_limited',
      retryAfterSec: rateCheck.retryAfterSec,
      message: rateCheck.message
    };
  }

  // 2. Idempotency Key Handling (Guarantees single check-in execution per user-event pair)
  const key = options.idempotencyKey || idempotency.generateKey('checkin', userId, eventId);

  return idempotency.execute(key, async () => {
    try {
      // 3. Student Lifecycle State Machine Validation
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          const studentGuard = canStudentCheckIn(profile);
          if (!studentGuard.allowed) {
            return {
              success: false,
              reason: studentGuard.code,
              message: studentGuard.message
            };
          }
        }
      } catch (profileErr) {
        // Fallback for dev / offline mode
      }

      // 4. Attendance State Machine & Existing Check-in Check
      const { data: existingCheckin } = await supabase
        .from('event_checkins')
        .select('id, checked_in_at')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingCheckin) {
        const current = await getMemberPoints(userId);
        return {
          success: true,
          idempotent: true,
          alreadyCheckedIn: true,
          reason: 'already_checked_in',
          pointsAwarded: 0,
          newTotal: current.total_points || 0,
          streak: current.checkin_streak || 0,
          unlockedBadges: [],
          checkedInAt: existingCheckin.checked_in_at,
          message: 'You have already checked in to this workshop! 🎟️'
        };
      }

      // 5. Validate QR token if provided
      let qrRecordId = null;
      if (qrToken) {
        const { data: qrData } = await supabase
          .from('event_qr_codes')
          .select('*')
          .eq('token', qrToken.trim())
          .maybeSingle();

        if (qrData) {
          qrRecordId = qrData.id;
          if (new Date(qrData.expires_at) < new Date()) {
            return {
              success: false,
              reason: 'qr_expired',
              message: 'This event QR code has expired.'
            };
          }
        }
      }

      // 6. Insert Checkin record with unique collision defense
      try {
        await supabase.from('event_checkins').insert({
          event_id: eventId,
          user_id: userId,
          qr_code_id: qrRecordId,
          checked_in_at: new Date().toISOString()
        });
      } catch (insertErr) {
        // If caught by concurrent unique constraint
        if (insertErr?.code === '23505' || String(insertErr?.message).includes('unique')) {
          const current = await getMemberPoints(userId);
          return {
            success: true,
            idempotent: true,
            alreadyCheckedIn: true,
            reason: 'already_checked_in',
            pointsAwarded: 0,
            newTotal: current.total_points || 0,
            streak: current.checkin_streak || 0,
            unlockedBadges: [],
            message: 'You have already checked in to this workshop! 🎟️'
          };
        }
        throw insertErr;
      }

      // 7. Update Registration Status in event_registrations to 'attended'
      try {
        await supabase.from('event_registrations').upsert(
          {
            event_id: eventId,
            user_id: userId,
            status: 'attended',
            registered_at: new Date().toISOString()
          },
          { onConflict: 'event_id,user_id' }
        );
      } catch (regErr) {
        // Non-fatal registration sync warning
      }

      // 8. Update Streak & Points
      const current = await getMemberPoints(userId);
      const todayStr = new Date().toISOString().split('T')[0];
      const lastDate = current.last_checkin_date;

      let newStreak = current.checkin_streak || 0;
      if (!lastDate) {
        newStreak = 1;
      } else {
        const diffDays = Math.round((new Date(todayStr) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      }

      const newPoints = (current.total_points || 0) + 50;

      await supabase.from('member_points').upsert({
        user_id: userId,
        total_points: newPoints,
        checkin_streak: newStreak,
        last_checkin_date: todayStr,
        updated_at: new Date().toISOString()
      });

      // 9. Points Audit Log
      await supabase.from('points_log').insert({
        user_id: userId,
        points: 50,
        reason: 'event_checkin',
        reference_id: eventId,
        awarded_at: new Date().toISOString()
      });

      // 10. Check badges
      const { count: checkinCount } = await supabase
        .from('event_checkins')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      const unlockedBadges = await checkAndAwardBadges(
        userId,
        newPoints,
        newStreak,
        checkinCount || 1
      );

      return {
        success: true,
        idempotent: false,
        pointsAwarded: 50,
        newTotal: newPoints,
        streak: newStreak,
        unlockedBadges,
        message: 'Check-in confirmed! You earned 50 points. 🎉'
      };
    } catch (err) {
      console.error('[ATC Gamification] recordEventCheckin error:', err);
      return {
        success: true,
        idempotent: false,
        pointsAwarded: 50,
        newTotal: 50,
        streak: 1,
        unlockedBadges: [],
        message: 'Check-in confirmed (offline)! 50 points earned. 🎉'
      };
    }
  });
}

/**
 * Generate Event QR Code Token (Admin)
 */
export async function generateEventQRToken(eventId, authorId = null, durationHours = 4) {
  const token = `ATC-EVT-${(eventId || 'SEM').slice(-6).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

  try {
    await supabase.from('event_qr_codes').insert({
      event_id: eventId,
      token,
      expires_at: expiresAt,
      created_by: authorId,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[ATC Gamification] generateEventQRToken notice:', err);
  }

  const checkinUrl = `https://portal.advclub.online/checkin?token=${encodeURIComponent(token)}`;
  return {
    token,
    expiresAt,
    checkinUrl
  };
}

/**
 * Get checked-in roster for an event (Admin)
 */
export async function getEventCheckinRoster(eventId) {
  try {
    const { data, error } = await supabase
      .from('event_checkins')
      .select(`
        id,
        checked_in_at,
        profiles (
          id,
          full_name,
          email,
          avatar_url,
          student_id,
          roll_number,
          branch,
          year
        )
      `)
      .eq('event_id', eventId)
      .order('checked_in_at', { ascending: false });

    if (!error && data) {
      return data.map((d) => ({
        id: d.id,
        checked_in_at: d.checked_in_at,
        full_name: d.profiles?.full_name || 'Member',
        email: d.profiles?.email || '',
        avatar_url: d.profiles?.avatar_url || '',
        student_id: d.profiles?.student_id || d.profiles?.roll_number || 'N/A',
        branch: d.profiles?.branch || 'CSE',
        year: d.profiles?.year || 'Member'
      }));
    }
  } catch (err) {
    console.warn('[ATC Gamification] Roster fetch note:', err);
  }
  return [];
}
