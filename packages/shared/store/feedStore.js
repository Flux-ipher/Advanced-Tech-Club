// packages/shared/store/feedStore.js
// Advanced Tech Club (ATC) — In-Memory Stale-While-Revalidate Feed Cache (Zustand)
// Caches announcements, workshops, and resources to eliminate duplicate Supabase reads

import { create } from 'zustand';

export const useFeedStore = create((set, get) => ({
  announcements: [],
  events: [],
  resources: [],
  lastFetchedAnnouncements: null,
  lastFetchedEvents: null,
  lastFetchedResources: null,
  STALE_MS: 60_000, // 60 seconds stale TTL

  isAnnouncementsStale: () => {
    const { lastFetchedAnnouncements, STALE_MS } = get();
    return !lastFetchedAnnouncements || Date.now() - lastFetchedAnnouncements > STALE_MS;
  },

  isEventsStale: () => {
    const { lastFetchedEvents, STALE_MS } = get();
    return !lastFetchedEvents || Date.now() - lastFetchedEvents > STALE_MS;
  },

  isResourcesStale: () => {
    const { lastFetchedResources, STALE_MS } = get();
    return !lastFetchedResources || Date.now() - lastFetchedResources > STALE_MS;
  },

  setAnnouncements: (announcements) =>
    set({ announcements, lastFetchedAnnouncements: Date.now() }),

  prependAnnouncement: (item) =>
    set((s) => {
      const exists = s.announcements.some((a) => a.id === item.id);
      if (exists) {
        return { announcements: s.announcements.map((a) => (a.id === item.id ? item : a)) };
      }
      return { announcements: [item, ...s.announcements] };
    }),

  setEvents: (events) =>
    set({ events, lastFetchedEvents: Date.now() }),

  setResources: (resources) =>
    set({ resources, lastFetchedResources: Date.now() }),

  clearFeedCache: () =>
    set({
      announcements: [],
      events: [],
      resources: [],
      lastFetchedAnnouncements: null,
      lastFetchedEvents: null,
      lastFetchedResources: null
    })
}));

export default useFeedStore;
