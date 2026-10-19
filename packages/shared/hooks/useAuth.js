// packages/shared/hooks/useAuth.js
// useAuth hook for session management, role verification, and Firebase Auth lifecycle

import { useEffect, useCallback } from 'react';
import { useAuthStore, isAdmin as checkIsAdmin, isSuperAdmin as checkIsSuperAdmin } from '../store/authStore.js';
import { getSupabaseClient, supabase } from '../supabaseClient.js';
import { firebaseAuth, isFirebaseConfigured } from '../firebaseClient.js';

// Global Auth State Listener
// Auto-rehydrates session and profile from Firebase ID Token & Supabase
export function useAuthListener() {
  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseAuth) return;

    let isMounted = true;
    useAuthStore.getState().setLoading(true);

    const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
      if (!isMounted) return;

      if (user) {
        try {
          const token = await user.getIdToken();
          const client = getSupabaseClient(token);
          const { data: profile, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.uid)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.warn('[ATC Auth] Could not fetch Supabase profile:', error.message);
          }

          useAuthStore.getState().setUser({
            firebaseUser: user,
            token,
            profile: profile || {
              id: user.uid,
              email: user.email,
              full_name: user.displayName || user.email?.split('@')[0] || 'Club Member',
              role: 'member',
              is_verified: true
            }
          });
        } catch (err) {
          console.error('[ATC Auth] Auth rehydration error:', err);
        } finally {
          useAuthStore.getState().setLoading(false);
        }
      } else {
        useAuthStore.getState().clear();
        useAuthStore.getState().setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);
}

export function useAuth() {
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const token = useAuthStore((s) => s.token);
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user || s.profile);
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);

  const setUser = useAuthStore((s) => s.setUser);
  const switchDemoUser = useAuthStore((s) => s.switchDemoUser);
  const updateUserProfile = useAuthStore((s) => s.updateUserProfile);
  const logout = useAuthStore((s) => s.logout);
  const clear = useAuthStore((s) => s.clear);

  // Role Checks
  const isSuperAdmin = checkIsSuperAdmin({ profile, user });
  const isAdmin = checkIsAdmin({ profile, user });
  const isMember = Boolean(user);
  const isVerified = Boolean(user && user.is_verified);
  const isPendingVerification = Boolean(user && user.verification_status === 'pending');

  // Firebase Sign In
  const signInWithEmail = useCallback(async (email, password) => {
    useAuthStore.getState().setLoading(true);
    useAuthStore.getState().setError(null);

    try {
      if (isFirebaseConfigured && firebaseAuth) {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const idToken = await cred.user.getIdToken();
        const client = getSupabaseClient(idToken);

        const { data: profileRow } = await client
          .from('profiles')
          .select('*')
          .eq('id', cred.user.uid)
          .single();

        const activeProfile = profileRow || {
          id: cred.user.uid,
          email: cred.user.email,
          full_name: cred.user.displayName || email.split('@')[0],
          role: 'member',
          is_verified: true
        };

        useAuthStore.getState().setUser({
          firebaseUser: cred.user,
          token: idToken,
          profile: activeProfile
        });

        return { user: cred.user, profile: activeProfile };
      } else {
        // Mock fallback
        const { data, error: sbErr } = await supabase.auth.signInWithPassword({ email, password });
        if (sbErr) throw sbErr;
        useAuthStore.getState().setUser(data.user);
        return { user: data.user, profile: data.user };
      }
    } catch (err) {
      useAuthStore.getState().setError(err.message);
      throw err;
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  }, []);

  // Firebase Sign Up with on-signup Edge Function trigger
  const signUpWithEmail = useCallback(async (email, password, fullName) => {
    useAuthStore.getState().setLoading(true);
    useAuthStore.getState().setError(null);

    try {
      if (isFirebaseConfigured && firebaseAuth) {
        const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
        const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        if (fullName) {
          await updateProfile(cred.user, { displayName: fullName });
        }
        const idToken = await cred.user.getIdToken();

        // Trigger Supabase on-signup Edge Function to insert profile using service role
        try {
          const meta = (new Function('return typeof import.meta !== "undefined" ? import.meta : {}'))();
          const supabaseUrl = (typeof process !== 'undefined' && process?.env?.VITE_SUPABASE_URL) || meta?.env?.VITE_SUPABASE_URL || '';
          if (supabaseUrl) {
            await fetch(`${supabaseUrl}/functions/v1/on-signup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken,
                fullName: fullName || email.split('@')[0],
                department: 'Computer Science & Engineering'
              })
            });
          }
        } catch (edgeErr) {
          console.warn('[ATC Auth] on-signup Edge Function call warning:', edgeErr);
        }

        const client = getSupabaseClient(idToken);
        const { data: profileRow } = await client
          .from('profiles')
          .select('*')
          .eq('id', cred.user.uid)
          .single();

        const newProfile = profileRow || {
          id: cred.user.uid,
          email: cred.user.email,
          full_name: fullName || email.split('@')[0],
          department: 'Computer Science & Engineering',
          role: 'member',
          is_verified: false,
          verification_status: 'pending'
        };

        useAuthStore.getState().setUser({
          firebaseUser: cred.user,
          token: idToken,
          profile: newProfile
        });

        return { user: cred.user, profile: newProfile, isNewUser: true };
      } else {
        // Fallback
        const newUser = {
          id: 'user-' + Date.now(),
          email,
          full_name: fullName || email.split('@')[0],
          department: 'Computer Science & Engineering',
          role: 'member',
          is_verified: false,
          verification_status: 'pending'
        };
        useAuthStore.getState().setUser(newUser);
        return { user: newUser, profile: newUser, isNewUser: true };
      }
    } catch (err) {
      useAuthStore.getState().setError(err.message);
      throw err;
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  }, []);

  // Firebase Sign In with Google
  const signInWithGoogle = useCallback(async () => {
    useAuthStore.getState().setLoading(true);
    useAuthStore.getState().setError(null);

    try {
      if (isFirebaseConfigured && firebaseAuth) {
        const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await signInWithPopup(firebaseAuth, provider);
        const idToken = await cred.user.getIdToken();

        // Trigger Supabase on-signup Edge Function to auto-create profile if needed
        try {
          const meta = (new Function('return typeof import.meta !== "undefined" ? import.meta : {}'))();
          const supabaseUrl = (typeof process !== 'undefined' && process?.env?.VITE_SUPABASE_URL) || meta?.env?.VITE_SUPABASE_URL || '';
          if (supabaseUrl) {
            await fetch(`${supabaseUrl}/functions/v1/on-signup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken,
                fullName: cred.user.displayName || cred.user.email?.split('@')[0] || 'Club Member',
                department: 'Computer Science & Engineering'
              })
            });
          }
        } catch (edgeErr) {
          console.warn('[ATC Auth] Google on-signup Edge Function call warning:', edgeErr);
        }

        const client = getSupabaseClient(idToken);
        const { data: profileRow } = await client
          .from('profiles')
          .select('*')
          .eq('id', cred.user.uid)
          .single();

        const activeProfile = profileRow || {
          id: cred.user.uid,
          email: cred.user.email,
          full_name: cred.user.displayName || cred.user.email?.split('@')[0] || 'Club Member',
          avatar_url: cred.user.photoURL || '',
          role: 'member',
          is_verified: false,
          verification_status: 'pending'
        };

        useAuthStore.getState().setUser({
          firebaseUser: cred.user,
          token: idToken,
          profile: activeProfile
        });

        const isNewUser = !profileRow || !profileRow.student_id;
        return { user: cred.user, profile: activeProfile, isNewUser };
      } else {
        // Fallback for offline / dev demo
        const mockGoogleUser = {
          id: 'google-user-' + Date.now(),
          email: 'student.google@gmail.com',
          full_name: 'Google Student',
          role: 'member',
          is_verified: false,
          verification_status: 'pending'
        };
        useAuthStore.getState().setUser(mockGoogleUser);
        return { user: mockGoogleUser, profile: mockGoogleUser, isNewUser: true };
      }
    } catch (err) {
      useAuthStore.getState().setError(err.message);
      throw err;
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  }, []);

  // Sign Out
  const signOut = useCallback(async () => {
    if (isFirebaseConfigured && firebaseAuth) {
      try {
        const { signOut: fbSignOut } = await import('firebase/auth');
        await fbSignOut(firebaseAuth);
      } catch (err) {
        console.warn('[ATC Auth] Firebase signOut error:', err);
      }
    }
    clear();
  }, [clear]);

  return {
    firebaseUser,
    token,
    profile,
    user,
    session,
    loading,
    error,
    isAdmin,
    isSuperAdmin,
    isMember,
    isVerified,
    isPendingVerification,
    setUser,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    switchDemoUser,
    updateUserProfile,
    logout
  };
}

export default useAuth;
