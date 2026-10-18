// useMembers hook for member listing, search, and role updates
import { useState, useEffect, useCallback } from 'react';
import { getAllProfiles, setRole, updateProfile, verifyMember, rejectMember } from '../api/profiles.js';

export function useMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllProfiles();
      setMembers(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const changeMemberRole = async (userId, newRole) => {
    const updated = await setRole(userId, newRole);
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
    );
    return updated;
  };

  const updateMemberDetails = async (userId, updates) => {
    const updated = await updateProfile(userId, updates);
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, ...updates } : m))
    );
    return updated;
  };

  const verifyMemberAccount = async (userId, adminId) => {
    const updated = await verifyMember(userId, adminId);
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, is_verified: true, verification_status: 'verified' } : m))
    );
    return updated;
  };

  const rejectMemberAccount = async (userId) => {
    const updated = await rejectMember(userId);
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, is_verified: false, verification_status: 'rejected' } : m))
    );
    return updated;
  };

  const pendingMembers = members.filter((m) => !m.is_verified || m.verification_status === 'pending');
  const verifiedMembers = members.filter((m) => m.is_verified);

  return {
    members,
    pendingMembers,
    verifiedMembers,
    loading,
    error,
    refresh: fetchMembers,
    changeMemberRole,
    updateMemberDetails,
    verifyMemberAccount,
    rejectMemberAccount
  };
}

export default useMembers;
