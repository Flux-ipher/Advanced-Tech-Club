// packages/shared/hooks/useAuth.js
// useAuth hook for session management, role verification, and Firebase Auth lifecycle

import { useEffect, useCallback } from 'react';
import { useAuthStore, isAdmin as checkIsAdmin, isSuperAdmin as checkIsSuperAdmin } from '../store/authStore.js';
import { getSupabaseClient, supabase } from '../supabaseClient.js';
import { firebaseAuth, isFirebaseConfigured } from '../firebaseClient.js';

// Helper: Checks if the user should be super_admin (first registered email or configured admin)
export async function resolveRoleAndProfile(client, firebaseUser, existingProfile) {
  const configuredAdminEmail = (
    (typeof process !== 'undefined' && process?.env?.VITE_ADMIN_EMAIL) ||
    ''
  ).trim().toLowerCase();

  const userEmail = (firebaseUser.email || '').trim().toLowerCase();
  const isExplicitAdmin = Boolean(configuredAdminEmail && userEmail === configuredAdminEmail);

  let isFirstUser = false;
  if (!isExplicitAdmin && client) {
    try {
      // Check if any admin or super_admin exists in profiles
      const { data: admins, count, error } = await client
        .from('profiles')
        .select('id, email, role', { count: 'exact' })
        .in('role', ['admin', 'super_admin']);

      if (!error) {
        // If 0 admins exist in profiles OR the only admin is this user
        if (count === 0 || (count === 1 && admins?.[0]?.id === firebaseUser.uid)) {
          isFirstUser = true;
        }
      }
    } catch (cntErr) {
      console.warn('[ATC Auth] Could not check existing admin count:', cntErr?.message);
    }
  }

  const shouldBeSuperAdmin = isExplicitAdmin || isFirstUser || existingProfile?.role === 'super_admin';

  const resolvedRole = shouldBeSuperAdmin ? 'super_admin' : (existingProfile?.role || 'member');
  const isVerified = shouldBeSuperAdmin ? true : (existingProfile?.is_verified ?? false);
  const verificationStatus = shouldBeSuperAdmin ? 'verified' : (existingProfile?.verification_status || 'pending');

  const resolved = {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    full_name: existingProfile?.full_name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || (shouldBeSuperAdmin ? 'Club Admin' : 'Club Member'),
    avatar_url: existingProfile?.avatar_url || firebaseUser.photoURL || '',
    department: existingProfile?.department || 'Computer Science & Engineering',
    student_id: existingProfile?.student_id || null,
    interests: existingProfile?.interests || [],
    role: resolvedRole,
    is_verified: isVerified,
    verification_status: verificationStatus
  };

  // If newly promoted to super_admin or profile record didn't exist in Supabase, persist immediately
  if (client && (shouldBeSuperAdmin || !existingProfile)) {
    try {
      await client
        .from('profiles')
        .upsert(resolved, { onConflict: 'id' });
    } catch (saveErr) {
      console.warn('[ATC Auth] Could not persist profile to Supabase:', saveErr?.message);
    }
  }

  return resolved;
}

// Helper: Get fresh Firebase ID Token (auto-refreshes if within 5m of expiry)
export async function getFreshToken(forceRefresh = false) {
  if (isFirebaseConfigured && firebaseAuth?.currentUser) {
    try {
      return await firebaseAuth.currentUser.getIdToken(forceRefresh);
    } catch (err) {
      console.warn('[ATC Auth] Could not fetch fresh ID token:', err?.message);
    }
  }
  return useAuthStore.getState().token || null;
}

// Helper: Run Supabase query with guaranteed fresh Firebase ID token
export async function secureQuery(queryFn) {
  const token = await getFreshToken(false);
  const client = getSupabaseClient(token);
  return queryFn(client);
}

// Global Auth State Listener
// Auto-rehydrates session and profile from Firebase ID Token & Supabase
export function useAuthListener() {
  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseAuth) return;

    let isMounted = true;
    // Only set loading to true if we do not already have a valid cached user
    // This prevents route-guards (VerificationGate) from flashing or redirecting to /login on page reload
    if (!useAuthStore.getState().user) {
      useAuthStore.getState().setLoading(true);
    }

    const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
      if (!isMounted) return;

      if (user) {
        try {
          const token = await user.getIdToken();
          let profile = null;
          let client = null;
          try {
            client = getSupabaseClient(token);
            const { data } = await client
              .from('profiles')
              .select('*')
              .eq('id', user.uid)
              .maybeSingle();
            profile = data;
          } catch (fetchErr) {
            console.warn('[ATC Auth] Could not fetch Supabase profile:', fetchErr?.message);
          }

          const resolved = await resolveRoleAndProfile(client, user, profile);

          useAuthStore.getState().setUser({
            firebaseUser: user,
            token,
            profile: resolved
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

    // Web Session Hardening: Force refresh token when tab becomes visible
    const handleVisibilityChange = async () => {
      if (typeof document !== 'undefined' && !document.hidden && firebaseAuth?.currentUser) {
        try {
          const freshToken = await firebaseAuth.currentUser.getIdToken(true);
          const currentStore = useAuthStore.getState();
          currentStore.setUser({
            firebaseUser: currentStore.firebaseUser || firebaseAuth.currentUser,
            token: freshToken,
            profile: currentStore.profile
          });
        } catch (e) {
          console.warn('[ATC Auth] Visibility token refresh warning:', e?.message);
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isMounted = false;
      unsubscribe();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
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
        let profileRow = null;
        try {
          const { data } = await client
            .from('profiles')
            .select('*')
            .eq('id', cred.user.uid)
            .maybeSingle();
          profileRow = data;
        } catch (fetchErr) {
          console.warn('[ATC Auth] Could not fetch profile on sign in:', fetchErr?.message);
        }

        const activeProfile = await resolveRoleAndProfile(client, cred.user, profileRow);

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

        let profileRow = null;
        let client = null;
        try {
          client = getSupabaseClient(idToken);
          const { data } = await client
            .from('profiles')
            .select('*')
            .eq('id', cred.user.uid)
            .maybeSingle();
          profileRow = data;
        } catch (dbErr) {
          console.warn('[ATC Auth] Supabase profile sync warning:', dbErr?.message);
        }

        const newProfile = await resolveRoleAndProfile(client, cred.user, profileRow || {
          id: cred.user.uid,
          email: cred.user.email,
          full_name: fullName || email.split('@')[0],
          department: 'Computer Science & Engineering',
          role: 'member',
          is_verified: false,
          verification_status: 'pending'
        });

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

        let profileRow = null;
        let client = null;
        try {
          client = getSupabaseClient(idToken);
          const { data } = await client
            .from('profiles')
            .select('*')
            .eq('id', cred.user.uid)
            .maybeSingle();
          profileRow = data;
        } catch (dbErr) {
          console.warn('[ATC Auth] Supabase profile sync warning:', dbErr?.message);
        }

        const activeProfile = await resolveRoleAndProfile(client, cred.user, profileRow);

        useAuthStore.getState().setUser({
          firebaseUser: cred.user,
          token: idToken,
          profile: activeProfile
        });

        const isNewUser = (!profileRow || !profileRow.student_id) && activeProfile.role !== 'super_admin';
        return { user: cred.user, profile: activeProfile, isNewUser };
      } else {
        // Fallback for offline / dev demo
        const mockGoogleUser = {
          id: 'google-user-' + Date.now(),
          email: 'admin.user@gmail.com',
          full_name: 'Club Administrator',
          role: 'super_admin',
          is_verified: true,
          verification_status: 'verified'
        };
        useAuthStore.getState().setUser(mockGoogleUser);
        return { user: mockGoogleUser, profile: mockGoogleUser, isNewUser: false };
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
    logout,
    getFreshToken,
    secureQuery
  };
}

export default useAuth;
