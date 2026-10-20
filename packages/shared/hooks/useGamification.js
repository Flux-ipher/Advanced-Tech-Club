// packages/shared/hooks/useGamification.js
// Advanced Tech Club (ATC) — React Hook for Gamification, Badges & Realtime Leaderboards

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import {
  getLeaderboard,
  getMyRank,
  getMemberPoints,
  getMemberBadges,
  getPointsLog,
  awardPoints,
  recordEventCheckin
} from '../api/gamification.js';

export function useLeaderboard(userId = null) {
  const [rankings, setRankings] = useState([]);
  const [myRank, setMyRank] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [board, rank] = await Promise.all([
        getLeaderboard(25),
        userId ? getMyRank(userId) : Promise.resolve(1)
      ]);
      setRankings(board);
      setMyRank(rank);
    } catch (err) {
      console.warn('[useLeaderboard] error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();

    // Realtime Leaderboard Subscription
    const channel = supabase
      .channel('realtime_leaderboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'member_points' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  return {
    rankings,
    myRank,
    loading,
    refresh: loadData
  };
}

export function useMemberGamification(userId) {
  const [points, setPoints] = useState({ total_points: 0, checkin_streak: 0, last_checkin_date: null });
  const [badges, setBadges] = useState([]);
  const [pointsLog, setPointsLog] = useState([]);
  const [myRank, setMyRank] = useState(1);
  const [loading, setLoading] = useState(true);
  const [newBadgeUnlocked, setNewBadgeUnlocked] = useState(null);

  const loadMemberData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const [pts, bdgs, log, rank] = await Promise.all([
        getMemberPoints(userId),
        getMemberBadges(userId),
        getPointsLog(userId),
        getMyRank(userId)
      ]);
      setPoints(pts);
      setBadges(bdgs);
      setPointsLog(log);
      setMyRank(rank);
    } catch (err) {
      console.warn('[useMemberGamification] error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMemberData();

    if (!userId) return;

    // Realtime Subscription for this user's points and badges
    const channel = supabase
      .channel(`realtime_gamification_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'member_points', filter: `user_id=eq.${userId}` },
        () => {
          loadMemberData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'member_badges', filter: `user_id=eq.${userId}` },
        (payload) => {
          loadMemberData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadMemberData]);

  const handleAwardPoints = async (action, referenceId = null, customPoints = null) => {
    if (!userId) return null;
    const res = await awardPoints(userId, action, referenceId, customPoints);
    if (res.unlockedBadges && res.unlockedBadges.length > 0) {
      setNewBadgeUnlocked(res.unlockedBadges[0]);
    }
    await loadMemberData();
    return res;
  };

  const handleCheckin = async (eventId, qrToken = null) => {
    if (!userId) return { success: false, message: 'Must be logged in to check in.' };
    const res = await recordEventCheckin(userId, eventId, qrToken);
    if (res.unlockedBadges && res.unlockedBadges.length > 0) {
      setNewBadgeUnlocked(res.unlockedBadges[0]);
    }
    await loadMemberData();
    return res;
  };

  return {
    points,
    badges,
    pointsLog,
    myRank,
    loading,
    newBadgeUnlocked,
    clearUnlockedBadge: () => setNewBadgeUnlocked(null),
    award: handleAwardPoints,
    checkin: handleCheckin,
    refresh: loadMemberData
  };
}
