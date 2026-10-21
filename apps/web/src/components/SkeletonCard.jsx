// apps/web/src/components/SkeletonCard.jsx
// ATC Platform — Security, Performance & UX Plan: Skeleton Loaders (Web)
// Provides content-shaped pulsing placeholders to eliminate blank screens and layout shifts

import React from 'react';

export function SkeletonAnnouncementCard() {
  return (
    <div className="voodoo-card p-6 rounded-2xl animate-pulse space-y-4 border border-neutral-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-200" />
          <div className="space-y-1.5">
            <div className="h-3.5 bg-neutral-200 rounded w-32" />
            <div className="h-2.5 bg-neutral-200 rounded w-20" />
          </div>
        </div>
        <div className="h-5 bg-neutral-200 rounded-full w-16" />
      </div>
      <div className="space-y-2 pt-1">
        <div className="h-4 bg-neutral-200 rounded w-3/4" />
        <div className="h-3 bg-neutral-200 rounded w-full" />
        <div className="h-3 bg-neutral-200 rounded w-5/6" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
        <div className="flex gap-2">
          <div className="h-7 w-12 bg-neutral-100 rounded-lg" />
          <div className="h-7 w-12 bg-neutral-100 rounded-lg" />
        </div>
        <div className="h-4 bg-neutral-200 rounded w-16" />
      </div>
    </div>
  );
}

export function SkeletonEventCard() {
  return (
    <div className="voodoo-card rounded-2xl overflow-hidden animate-pulse border border-neutral-200/80 bg-white shadow-sm flex flex-col">
      <div className="h-44 bg-neutral-200 w-full" />
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-neutral-200 rounded w-20" />
            <div className="h-3 bg-neutral-200 rounded w-16" />
          </div>
          <div className="h-5 bg-neutral-200 rounded w-4/5" />
          <div className="h-3 bg-neutral-200 rounded w-full" />
        </div>
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <div className="h-3 bg-neutral-200 rounded w-24" />
          <div className="h-8 bg-neutral-200 rounded-xl w-24" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonResourceCard() {
  return (
    <div className="voodoo-card p-5 rounded-2xl animate-pulse space-y-3 border border-neutral-200/80 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-neutral-200" />
        <div className="h-4 bg-neutral-200 rounded w-14" />
      </div>
      <div className="space-y-1.5 pt-1">
        <div className="h-4 bg-neutral-200 rounded w-3/4" />
        <div className="h-3 bg-neutral-200 rounded w-full" />
        <div className="h-3 bg-neutral-200 rounded w-2/3" />
      </div>
      <div className="pt-2 flex items-center justify-between">
        <div className="h-3 bg-neutral-200 rounded w-16" />
        <div className="h-7 bg-neutral-200 rounded-lg w-20" />
      </div>
    </div>
  );
}

export function SkeletonLeaderboardRow() {
  return (
    <div className="p-4 flex items-center justify-between animate-pulse border-b border-neutral-100">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-neutral-200" />
        <div className="w-10 h-10 rounded-full bg-neutral-200" />
        <div className="space-y-1">
          <div className="h-3.5 bg-neutral-200 rounded w-28" />
          <div className="h-2.5 bg-neutral-200 rounded w-16" />
        </div>
      </div>
      <div className="space-y-1 text-right">
        <div className="h-4 bg-neutral-200 rounded w-16 ml-auto" />
        <div className="h-2.5 bg-neutral-200 rounded w-10 ml-auto" />
      </div>
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Profile Header Box */}
      <div className="voodoo-card p-6 sm:p-8 rounded-3xl border border-neutral-200/80 bg-white shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-neutral-200" />
        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="h-6 bg-neutral-200 rounded w-48 mx-auto sm:mx-0" />
          <div className="h-3.5 bg-neutral-200 rounded w-36 mx-auto sm:mx-0" />
          <div className="h-3 bg-neutral-200 rounded w-28 mx-auto sm:mx-0" />
        </div>
        <div className="h-10 bg-neutral-200 rounded-xl w-32" />
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="voodoo-card p-4 rounded-2xl border border-neutral-200/80 bg-white text-center space-y-2">
            <div className="h-3 bg-neutral-200 rounded w-16 mx-auto" />
            <div className="h-7 bg-neutral-200 rounded w-20 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default {
  SkeletonAnnouncementCard,
  SkeletonEventCard,
  SkeletonResourceCard,
  SkeletonLeaderboardRow,
  SkeletonProfile
};
