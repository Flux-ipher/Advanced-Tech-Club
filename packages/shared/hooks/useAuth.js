// useAuth hook for role checking and session management
import { useAuthStore } from '../store/authStore.js';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);
  const switchDemoUser = useAuthStore((s) => s.switchDemoUser);
  const updateUserProfile = useAuthStore((s) => s.updateUserProfile);
  const logout = useAuthStore((s) => s.logout);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isMember = Boolean(user);
  const isVerified = Boolean(user && user.is_verified);
  const isPendingVerification = Boolean(user && user.verification_status === 'pending');

  return {
    user,
    session,
    loading,
    isAdmin,
    isSuperAdmin,
    isMember,
    isVerified,
    isPendingVerification,
    setUser,
    switchDemoUser,
    updateUserProfile,
    logout
  };
}

export default useAuth;
