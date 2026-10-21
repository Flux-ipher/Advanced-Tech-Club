// packages/shared/store/authStore.js
// Auth Zustand Store for ATC Platform
// Bridges Firebase Auth identity and Supabase profiles table with instant localStorage caching

import { create } from 'zustand';
import { initialProfiles } from '../mockData.js';
import { mockDb } from '../supabaseClient.js';

const STORAGE_KEY = 'atc_auth_session_v1';

function loadCachedSession() {
  if (typeof window === 'undefined') return { user: null, profile: null, token: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, profile: null, token: null };
    const parsed = JSON.parse(raw);
    const profile = parsed?.profile || parsed?.user || null;
    return {
      user: profile,
      profile: profile,
      token: null // Never store or restore raw JWT ID token in localStorage per Plan
    };
  } catch (err) {
    return { user: null, profile: null, token: null };
  }
}

function saveCachedSession(profile) {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      // Only cache profile metadata (id, name, avatar, role, verification_status)
      // Never store raw JWT tokens in localStorage (Firebase SDK manages tokens securely internally)
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: profile, profile })
      );
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[ATC Auth] Could not cache session:', err);
  }
}

function clearCachedSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {}
}

const cached = loadCachedSession();

export const useAuthStore = create((set, get) => ({
  firebaseUser: null,
  token: cached.token,
  profile: cached.profile,
  user: cached.user,
  session: cached.user ? { user: cached.user } : null,
  loading: cached.user ? false : true, // false if cached session exists, true to wait for Firebase if no cache
  error: null,

  // Accepts either { firebaseUser, token, profile } or single user/profile object
  setUser: (payload) => {
    if (!payload) {
      clearCachedSession();
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
      saveCachedSession(activeProfile, payload.token || get().token);
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
      saveCachedSession(payload, get().token);
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

  clear: () => {
    clearCachedSession();
    set({
      firebaseUser: null,
      token: null,
      profile: null,
      user: null,
      session: null,
      error: null
    });
  },

  // Helper to switch profiles for demo evaluation (super_admin, admin, member)
  switchDemoUser: (roleOrId) => {
    let target = initialProfiles.find((p) => p.id === roleOrId);
    if (!target) {
      target = initialProfiles.find((p) => p.role === roleOrId);
    }
    if (target) {
      saveCachedSession(target, get().token);
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
      saveCachedSession(updated, get().token);
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

  logout: () => {
    clearCachedSession();
    set({
      firebaseUser: null,
      token: null,
      profile: null,
      user: null,
      session: null
    });
  }
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
