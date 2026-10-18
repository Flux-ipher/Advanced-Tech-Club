// Auth Zustand Store
import { create } from 'zustand';
import { initialProfiles } from '../mockData.js';
import { mockDb } from '../supabaseClient.js';

export const useAuthStore = create((set, get) => ({
  user: initialProfiles[0], // Defaults to Ritesh Mishra (Super Admin)
  session: { user: initialProfiles[0] },
  loading: false,
  error: null,

  setUser: (user) => set({ user, session: user ? { user } : null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Helper to switch profiles for testing roles (super_admin, admin, member)
  switchDemoUser: (roleOrId) => {
    let target = initialProfiles.find((p) => p.id === roleOrId);
    if (!target) {
      target = initialProfiles.find((p) => p.role === roleOrId);
    }
    if (target) {
      set({ user: target, session: { user: target } });
      return target;
    }
    return get().user;
  },

  updateUserProfile: (updates) => {
    const current = get().user;
    if (current) {
      const updated = { ...current, ...updates };
      set({ user: updated, session: { user: updated } });
      if (mockDb?.storage?.profiles) {
        const idx = mockDb.storage.profiles.findIndex((p) => p.id === current.id);
        if (idx !== -1) {
          mockDb.storage.profiles[idx] = updated;
        }
      }
    }
  },

  logout: () => set({ user: null, session: null })
}));
