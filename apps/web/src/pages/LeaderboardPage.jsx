// apps/web/src/pages/LeaderboardPage.jsx
// Advanced Tech Club (ATC) — Live Campus Engineering Leaderboard & Gamification Showcase

import React, { useState } from 'react';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useLeaderboard, useMemberGamification } from '@atc/shared/hooks/useGamification';
import { SkeletonLeaderboardRow } from '../components/SkeletonCard';
import { Trophy, Flame, Award, Sparkles, Shield, ChevronRight, CheckCircle2, Star, Users, Eye, EyeOff } from 'lucide-react';

export function LeaderboardPage() {
  const { user, isAdmin } = useAuth();
  const { rankings, myRank, loading, refresh, toggleVisibility } = useLeaderboard(user?.id, isAdmin);
  const { badges, points } = useMemberGamification(user?.id);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const topThree = rankings.slice(0, 3);
  const restOfRankings = rankings.slice(3);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* 1. HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-950 border border-neutral-800 p-8 text-white shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-warning-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300 text-xs font-semibold mb-3">
              <Trophy className="w-3.5 h-3.5 text-warning-400" />
              <span>Campus Engineering League · Spring 2026</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
              Club Leaderboard & Accolades
            </h1>
            <p className="text-sm text-neutral-400 max-w-xl leading-relaxed">
              Earn contribution points by checking in at campus workshops, contributing to the Knowledge Vault, and leading open-source initiatives.
            </p>
          </div>

          {/* User's Quick Rank Capsule */}
          {user && (
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center font-black text-xl text-white shadow-inner">
                #{myRank}
              </div>
              <div>
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Your Standing</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-lg font-extrabold text-white">{points.total_points || 0} pts</span>
                  <span className="text-xs font-semibold text-warning-400 flex items-center gap-1 bg-warning-500/10 px-2 py-0.5 rounded-full">
                    <Flame className="w-3.5 h-3.5 fill-warning-400" />
                    {points.checkin_streak || 0} streak
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. THE PODIUM STAGE (TOP 3) */}
      {topThree.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          {/* 2nd Place */}
          <div className="order-2 md:order-1 relative rounded-2xl bg-white border border-neutral-200 p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute -top-4 px-3 py-0.5 bg-neutral-200 text-neutral-700 text-xs font-bold rounded-full border border-neutral-300">
              🥈 2nd Place
            </div>
            <img
              src={topThree[1].avatar_url}
              alt={topThree[1].full_name}
              className="w-20 h-20 rounded-full border-4 border-neutral-200 object-cover mt-2 mb-3"
            />
            <h3 className="font-extrabold text-neutral-900 text-base">{topThree[1].full_name}</h3>
            <p className="text-xs text-neutral-500 mb-3">{topThree[1].branch} · {topThree[1].year}</p>
            <div className="mt-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-neutral-100 font-extrabold text-neutral-800 text-sm">
              <span>{topThree[1].total_points}</span>
              <span className="text-xs text-neutral-500 font-normal">pts</span>
            </div>
          </div>

          {/* 1st Place (Champion Spotlight) */}
          <div className="order-1 md:order-2 relative rounded-3xl bg-gradient-to-b from-amber-500/10 via-white to-white border-2 border-amber-400/60 p-8 flex flex-col items-center text-center shadow-lg md:-translate-y-4">
            <div className="absolute -top-4 px-4 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-xs font-black rounded-full shadow-md flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>👑 1st Champion</span>
            </div>
            <div className="relative mt-2 mb-3">
              <img
                src={topThree[0].avatar_url}
                alt={topThree[0].full_name}
                className="w-24 h-24 rounded-full border-4 border-amber-400 shadow-md object-cover"
              />
              <span className="absolute bottom-0 right-0 w-7 h-7 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center font-bold text-xs shadow">
                🥇
              </span>
            </div>
            <h3 className="font-black text-neutral-900 text-lg">{topThree[0].full_name}</h3>
            <p className="text-xs font-medium text-neutral-500 mb-4">{topThree[0].branch} · {topThree[0].year}</p>
            <div className="mt-auto inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-amber-500 text-white font-black text-base shadow-sm">
              <Trophy className="w-4 h-4" />
              <span>{topThree[0].total_points} pts</span>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="order-3 relative rounded-2xl bg-white border border-neutral-200 p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute -top-4 px-3 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
              🥉 3rd Place
            </div>
            <img
              src={topThree[2].avatar_url}
              alt={topThree[2].full_name}
              className="w-20 h-20 rounded-full border-4 border-amber-100 object-cover mt-2 mb-3"
            />
            <h3 className="font-extrabold text-neutral-900 text-base">{topThree[2].full_name}</h3>
            <p className="text-xs text-neutral-500 mb-3">{topThree[2].branch} · {topThree[2].year}</p>
            <div className="mt-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-neutral-100 font-extrabold text-neutral-800 text-sm">
              <span>{topThree[2].total_points}</span>
              <span className="text-xs text-neutral-500 font-normal">pts</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. FULL LEADERBOARD ROSTER */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-500" />
            <h2 className="font-bold text-neutral-900 text-sm">Campus Engineers Ranking</h2>
            {isAdmin && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-warning-50 text-warning-700 border border-warning-200">
                Admin Moderation Active
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-neutral-400">
            {isAdmin ? 'Click Eye Icon to Toggle Visibility' : 'Realtime Auto-Syncing ⚡'}
          </span>
        </div>

        <div className="divide-y divide-neutral-100">
          {loading ? (
            [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <SkeletonLeaderboardRow key={i} />
            ))
          ) : rankings.map((member) => {
            const isCurrentUser = user && member.user_id === user.id;
            const isVisible = member.show_on_leaderboard !== false;

            return (
              <div
                key={member.user_id}
                className={`px-6 py-4 flex items-center gap-4 transition-colors ${
                  !isVisible ? 'bg-neutral-100/70 opacity-60' : isCurrentUser ? 'bg-primary-50/50 hover:bg-primary-50' : 'hover:bg-neutral-50'
                }`}
              >
                {/* Rank Badge */}
                <div className="w-8 text-center shrink-0">
                  {member.rank === 1 ? (
                    <span className="text-lg">🥇</span>
                  ) : member.rank === 2 ? (
                    <span className="text-lg">🥈</span>
                  ) : member.rank === 3 ? (
                    <span className="text-lg">🥉</span>
                  ) : (
                    <span className="font-mono font-bold text-neutral-400 text-sm">
                      #{member.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <img
                  src={member.avatar_url}
                  alt={member.full_name}
                  className="w-10 h-10 rounded-full object-cover border border-neutral-200 shrink-0"
                />

                {/* Name & Academic info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm truncate ${!isVisible ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>
                      {member.full_name}
                    </p>
                    {isCurrentUser && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-100 text-primary-700">
                        You
                      </span>
                    )}
                    {!isVisible && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-200 text-neutral-600">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 truncate">
                    {member.branch} · {member.year}
                  </p>
                </div>

                {/* Streak Pill */}
                {member.checkin_streak > 0 && (
                  <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning-50 text-warning-700 border border-warning-200/60 text-xs font-semibold shrink-0">
                    <Flame className="w-3.5 h-3.5 fill-warning-500 text-warning-500" />
                    <span>{member.checkin_streak} streak</span>
                  </div>
                )}

                {/* Points Pill */}
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-sm text-primary-600 block">
                    {member.total_points} pts
                  </span>
                </div>

                {/* Admin Visibility Toggle */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleVisibility(member.user_id, !isVisible)}
                    title={isVisible ? 'Visible on Leaderboard. Click to hide.' : 'Hidden from Leaderboard. Click to show.'}
                    className={`shrink-0 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                      isVisible
                        ? 'bg-success-50 text-success-700 border border-success-200 hover:bg-success-100'
                        : 'bg-neutral-200 text-neutral-600 border border-neutral-300 hover:bg-neutral-300'
                    }`}
                  >
                    {isVisible ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-success-600" />
                        <span className="hidden md:inline">Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="hidden md:inline">Hidden</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CLUB BADGES SHOWCASE */}
      <div className="bg-neutral-900 rounded-3xl p-8 border border-neutral-800 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Award className="w-5 h-5 text-warning-400" />
              <span>Badges & Achievements Catalog</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Unlock badges through workshop attendances, resource curation, and engineering sprints.
            </p>
          </div>
          <span className="text-xs bg-white/10 px-3 py-1 rounded-full font-semibold self-start sm:self-auto">
            10 Badges Available
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[
            { id: '1', name: 'First Step', icon: '🏁', desc: 'Attended your first club workshop', pts: '50 pts' },
            { id: '2', name: 'Regular', icon: '📅', desc: 'Attended 5 club technical sessions', pts: '250 pts' },
            { id: '3', name: 'Dedicated', icon: '⭐', desc: 'Attended 10 campus engineering events', pts: '500 pts' },
            { id: '4', name: 'Centurion', icon: '💯', desc: 'Earned 100 platform points', pts: '100 pts' },
            { id: '5', name: 'Rising Star', icon: '🚀', desc: 'Earned 300 engineering points', pts: '300 pts' },
            { id: '6', name: 'Club Legend', icon: '🏆', desc: 'Achieved 1,000 points landmark', pts: '1,000 pts' },
            { id: '7', name: 'Resource Hunter', icon: '📚', desc: 'Downloaded 10 guides from the Vault', pts: 'Vault' },
            { id: '8', name: 'On Fire', icon: '🔥', desc: '3-event consecutive check-in streak', pts: 'Streak' },
            { id: '9', name: 'Unstoppable', icon: '⚡', desc: '5-event consecutive check-in streak', pts: 'Streak' },
            { id: '10', name: 'Admin Contributor', icon: '🛠️', desc: 'Awarded to core student coordinators', pts: 'Honors' }
          ].map((b) => {
            const hasEarned = badges?.some((ub) => ub.name === b.name || ub.id === b.id);
            return (
              <div
                key={b.id}
                onClick={() => setSelectedBadge(b)}
                className={`cursor-pointer rounded-2xl p-4 border transition-all text-center flex flex-col items-center justify-between ${
                  hasEarned
                    ? 'bg-white/10 border-warning-400/40 shadow-sm'
                    : 'bg-white/5 border-white/5 opacity-70 hover:opacity-100 hover:bg-white/10'
                }`}
              >
                <span className="text-3xl mb-2 block">{b.icon}</span>
                <p className="font-bold text-xs text-white mb-1">{b.name}</p>
                <p className="text-[10px] text-neutral-400 line-clamp-2 leading-tight mb-2">{b.desc}</p>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  hasEarned ? 'bg-warning-500/20 text-warning-300' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {hasEarned ? '✓ Unlocked' : b.pts}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
export default LeaderboardPage;
