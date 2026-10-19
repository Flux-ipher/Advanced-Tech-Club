// packages/shared/store/authStore.js
// Auth Zustand Store for ATC Platform
// Bridges Firebase Auth identity and Supabase profiles table

import { create } from 'zustand';
import { initialProfiles } from '../mockData.js';
import { mockDb } from '../supabaseClient.js';

export const useAuthStore = create((set, get) => ({
  firebaseUser: null,
  token: null,
  profile: null, // Starts unauthenticated (no mock users)
  user: null,    // Starts unauthenticated
  session: null,
  loading: false,
  error: null,

  // Accepts either { firebaseUser, token, profile } or single user/profile object
  setUser: (payload) => {
    if (!payload) {
      set({
        firebaseUser: null,
        token: null,
        profile: null,
        user: null,
        session: null,
        error: null
      });
      return;
    }

    if (payload.firebaseUser || payload.token || payload.profile) {
      const activeProfile = payload.profile || payload.firebaseUser || get().profile;
      set({
        firebaseUser: payload.firebaseUser || null,
        token: payload.token || null,
        profile: activeProfile,
        user: activeProfile,
        session: activeProfile ? { user: activeProfile } : null,
        error: null
      });
    } else {
      // Direct user/profile update
      set({
        profile: payload,
        user: payload,
        session: payload ? { user: payload } : null,
        error: null
      });
    }
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  clear: () =>
    set({
      firebaseUser: null,
      token: null,
      profile: null,
      user: null,
      session: null,
      error: null
    }),

  // Helper to switch profiles for demo evaluation (super_admin, admin, member)
  switchDemoUser: (roleOrId) => {
    let target = initialProfiles.find((p) => p.id === roleOrId);
    if (!target) {
      target = initialProfiles.find((p) => p.role === roleOrId);
    }
    if (target) {
      set({
        profile: target,
        user: target,
        session: { user: target }
      });
      return target;
    }
    return get().user;
  },

  updateUserProfile: (updates) => {
    const current = get().profile || get().user;
    if (current) {
      const updated = { ...current, ...updates };
      set({
        profile: updated,
        user: updated,
        session: { user: updated }
      });
      if (mockDb?.storage?.profiles) {
        const idx = mockDb.storage.profiles.findIndex((p) => p.id === current.id);
        if (idx !== -1) {
          mockDb.storage.profiles[idx] = updated;
        }
      }
    }
  },

  logout: () =>
    set({
      firebaseUser: null,
      token: null,
      profile: null,
      user: null,
      session: null
    })
}));

// Role Helpers as specified in Firebase Integration Plan
export const isAdmin = (store) => {
  const p = store?.profile || store?.user;
  return p?.role === 'admin' || p?.role === 'super_admin';
};

export const isSuperAdmin = (store) => {
  const p = store?.profile || store?.user;
  return p?.role === 'super_admin';
};

export default useAuthStore;
