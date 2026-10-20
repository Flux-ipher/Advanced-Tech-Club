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
  recordEventCheckin
} from '../api/gamification.js';
import { initialBadges } from '../mockData.js';

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
      setRankings(board || []);
      setMyRank(rank || 1);
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
    rankings: rankings || [],
    myRank: myRank || 1,
    loading,
    refresh: loadData
  };
}

export function useMemberGamification(userId) {
  const [points, setPoints] = useState({ total_points: 0, checkin_streak: 0, last_checkin_date: null });
  const [badges, setBadges] = useState([]);
  const [allBadges, setAllBadges] = useState(initialBadges || []);
  const [pointsLog, setPointsLog] = useState([]);
  const [myRank, setMyRank] = useState(1);
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
        getMyRank(userId).catch(() => 1),
        allDefsPromise
      ]);
      setPoints(pts || { total_points: 0, checkin_streak: 0, last_checkin_date: null });
      setBadges(bdgs || []);
      setPointsLog(log || []);
      setMyRank(rank || 1);
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
