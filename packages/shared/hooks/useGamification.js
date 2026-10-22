// packages/shared/hooks/useGamification.js
// Advanced Tech Club (ATC) — React Hook for Gamification, Badges & Realtime Leaderboards

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import {
  getLeaderboard,
  getMyRank,
  getMemberPoints,
  getAllBadges,
  getMemberBadges,
  getPointsLog,
  awardPoints,
  recordEventCheckin,
  toggleLeaderboardVisibility
} from '../api/gamification.js';
import { initialBadges } from '../mockData.js';

export function useLeaderboard(userId = null, includeHidden = false) {
  const [rankings, setRankings] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [board, rank] = await Promise.all([
        getLeaderboard(50, includeHidden),
        userId ? getMyRank(userId) : Promise.resolve(null)
      ]);
      setRankings(board || []);
      setMyRank(rank);
    } catch (err) {
      console.warn('[useLeaderboard] error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, includeHidden]);

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

  const toggleVisibility = async (targetUserId, isVisible) => {
    setRankings((prev) => {
      const updated = prev.map((r) =>
        r.user_id === targetUserId ? { ...r, show_on_leaderboard: isVisible } : r
      );
      // Immediately recalculate ranks so visible ranks shift up/down
      let visibleRank = 1;
      return updated.map((item) => ({
        ...item,
        rank: item.show_on_leaderboard !== false ? visibleRank++ : null
      }));
    });

    const res = await toggleLeaderboardVisibility(targetUserId, isVisible);
    if (!res.success) {
      loadData(); // Revert on failure
    } else if (userId) {
      getMyRank(userId).then(setMyRank);
    }
    return res;
  };

  return {
    rankings: rankings || [],
    myRank,
    loading,
    refresh: loadData,
    toggleVisibility
  };
}

export function useMemberGamification(userId) {
  const [points, setPoints] = useState({ total_points: 0, checkin_streak: 0, last_checkin_date: null });
  const [badges, setBadges] = useState([]);
  const [allBadges, setAllBadges] = useState(initialBadges || []);
  const [pointsLog, setPointsLog] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newBadgeUnlocked, setNewBadgeUnlocked] = useState(null);

  const loadMemberData = useCallback(async () => {
    try {
      const allDefsPromise = getAllBadges().catch(() => initialBadges || []);
      if (!userId) {
        const defs = await allDefsPromise;
        if (defs && defs.length > 0) setAllBadges(defs);
        setLoading(false);
        return;
      }
      const [pts, bdgs, log, rank, defs] = await Promise.all([
        getMemberPoints(userId).catch(() => ({ total_points: 0, checkin_streak: 0, last_checkin_date: null })),
        getMemberBadges(userId).catch(() => []),
        getPointsLog(userId).catch(() => []),
        getMyRank(userId).catch(() => null),
        allDefsPromise
      ]);
      setPoints(pts || { total_points: 0, checkin_streak: 0, last_checkin_date: null });
      setBadges(bdgs || []);
      setPointsLog(log || []);
      setMyRank(rank);
      if (defs && defs.length > 0) {
        setAllBadges(defs);
      }
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
        () => {
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
    if (res?.unlockedBadges && res.unlockedBadges.length > 0) {
      setNewBadgeUnlocked(res.unlockedBadges[0]);
    }
    await loadMemberData();
    return res;
  };

  const handleCheckin = async (eventId, qrToken = null) => {
    if (!userId) return { success: false, message: 'Must be logged in to check in.' };
    const res = await recordEventCheckin(userId, eventId, qrToken);
    if (res?.unlockedBadges && res.unlockedBadges.length > 0) {
      setNewBadgeUnlocked(res.unlockedBadges[0]);
    }
    await loadMemberData();
    return res;
  };

  return {
    points: points || { total_points: 0, checkin_streak: 0, last_checkin_date: null },
    totalPoints: points?.total_points || 0,
    streak: points?.checkin_streak || 0,
    rank: myRank || 1,
    myRank: myRank || 1,
    badges: badges || [],
    earnedBadges: badges || [],
    allBadges: allBadges || initialBadges || [],
    pointsLog: pointsLog || [],
    loading,
    newBadgeUnlocked,
    clearUnlockedBadge: () => setNewBadgeUnlocked(null),
    award: handleAwardPoints,
    checkin: handleCheckin,
    refresh: loadMemberData
  };
}
