import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useMembers } from '@atc/shared/hooks/useMembers';
import { RoleBadge } from '../components/RoleBadge';
import { Modal, ConfirmDialog } from '../components/Modal';
import { formatDate } from '@atc/shared/utils/formatters';
import {
  ShieldAlert,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Shield,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';

export function MembersAdminPage() {
  const { user, isSuperAdmin, switchDemoUser } = useAuth();
  const {
    members,
    pendingMembers,
    verifiedMembers,
    loading,
    changeMemberRole,
    verifyMemberAccount,
    rejectMemberAccount,
    toggleLeaderboard
  } = useMembers();

  const [activeTab, setActiveTab] = useState('verifications'); // 'verifications' | 'roster'
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  // Role Change Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [targetRole, setTargetRole] = useState('member');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  if (!isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 voodoo-card text-center space-y-4">
        <div className="w-12 h-12 bg-danger-50 text-danger-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">Admin Access Only</h2>
        <p className="text-sm text-neutral-500">
          Only the Club Admin (<strong>Ritesh Mishra</strong>) has permission to verify student applicants and manage club access.
        </p>
        <div className="pt-2">
          <Link
            to="/portal"
            className="btn-primary text-xs w-full py-2.5 inline-block text-center"
          >
            Return to Club Portal
          </Link>
        </div>
      </div>
    );
  }

  // Filter members for Roster Tab
  const filteredRoster = members.filter((m) => {
    const matchesSearch =
      m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.student_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept =
      departmentFilter === 'All' ? true : m.department === departmentFilter;

    const matchesRole =
      roleFilter === 'All' ? true : m.role === roleFilter;

    return matchesSearch && matchesDept && matchesRole;
  });

  const handleOpenRoleModal = (memberUser, newRole) => {
    if (memberUser.role === 'super_admin') {
      alert('The Super Admin role cannot be modified.');
      return;
    }
    setSelectedUser(memberUser);
    setTargetRole(newRole);
    setIsConfirmOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return;
    try {
      await changeMemberRole(selectedUser.id, targetRole);
      setActionSuccess(`Updated ${selectedUser.full_name}'s role to ${targetRole}.`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      alert(err.message || 'Error updating role');
    } finally {
      setIsConfirmOpen(false);
      setSelectedUser(null);
    }
  };

  const handleVerifyStudent = async (studentId) => {
    const student = members.find((m) => m.id === studentId);
    try {
      await verifyMemberAccount(studentId, user?.id);
      setActionSuccess(`Verified ${student?.full_name || 'student'}. Portal access is now unlocked!`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error('Verify error:', err);
      alert('Verification failed: ' + (err.message || 'Please check connection'));
    }
  };

  const handleRejectStudent = async (studentId) => {
    const student = members.find((m) => m.id === studentId);
    try {
      await rejectMemberAccount(studentId);
      setActionSuccess(`Rejected application for ${student?.full_name || 'student'}.`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error('Reject error:', err);
      alert('Rejection failed: ' + (err.message || 'Please check connection'));
    }
  };

  const pendingCount = pendingMembers.length;
  const verifiedCount = verifiedMembers.length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-primary-100 text-primary-700">
              <Shield className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700">
              Admin Console
            </span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Member Verification & Role Access
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Review student membership applications and manage member access.
          </p>
        </div>

        {/* Stats badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-warning-50 text-warning-700 border border-warning-200">
            <span>Pending Review: </span>
            <strong className="font-bold">{pendingCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-success-50 text-success-700 border border-success-200">
            <span>Verified: </span>
            <strong className="font-bold">{verifiedCount}</strong>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-success-50 border border-success-200 text-success-700 text-xs font-semibold rounded-lg flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4" /> {actionSuccess}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 gap-2">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'verifications'
              ? 'border-primary-500 text-primary-600 bg-primary-50/30'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Verifications
          {pendingCount > 0 && (
            <span className="px-2 py-0.2 rounded-full text-[10px] bg-warning-500 text-white font-bold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'roster'
              ? 'border-primary-500 text-primary-600 bg-primary-50/30'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Active Member Roster & Roles ({verifiedCount})
        </button>
      </div>

      {/* TAB 1: PENDING VERIFICATIONS */}
      {activeTab === 'verifications' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-700 flex items-center justify-between">
            <p>
              Students listed here registered through the website or mobile app and cannot access member features until you approve them.
            </p>
          </div>

          {pendingMembers.length === 0 ? (
            <div className="voodoo-card p-12 text-center text-neutral-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-success-500 mx-auto opacity-60" />
              <h3 className="text-base font-bold text-neutral-800">All Student Applications Reviewed!</h3>
              <p className="text-xs text-neutral-500">There are no pending registrations waiting for verification.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingMembers.map((student) => (
                <div key={student.id} className="voodoo-card p-5 flex flex-col justify-between border-warning-200 bg-warning-50/10">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                          alt={student.full_name}
                          className="w-11 h-11 rounded-full object-cover border border-neutral-200"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-neutral-900">{student.full_name}</h4>
                          <p className="text-xs text-neutral-500">{student.email}</p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-warning-100 text-warning-800 border border-warning-200">
                        Pending
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-white border border-neutral-200 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p>
                          <strong className="text-neutral-700">Student ID:</strong>{' '}
                          <span className="font-mono font-bold text-neutral-900">{student.student_id || 'ID-NA'}</span>
                        </p>
                        {student.application_id && (
                          <span className="px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 font-mono text-[10px] font-bold border border-primary-200">
                            {student.application_id}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-neutral-600">
                        <p>
                          <strong className="text-neutral-700">Department:</strong> {student.department || 'Computer Science & Engineering'}
                        </p>
                        {student.year && (
                          <span className="text-[11px] font-medium text-neutral-500">
                            Year: {student.year}
                          </span>
                        )}
                      </div>

                      {student.github_url && (
                        <p className="pt-1">
                          <strong className="text-neutral-700">GitHub:</strong>{' '}
                          <a
                            href={student.github_url.startsWith('http') ? student.github_url : `https://${student.github_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline font-mono text-[11px] inline-flex items-center gap-1"
                          >
                            <span>{student.github_url.replace(/^https?:\/\/(www\.)?github\.com\//, '@')}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </p>
                      )}

                      {Array.isArray(student.interests) && student.interests.length > 0 && (
                        <div className="pt-1">
                          <p className="text-[11px] text-neutral-500 font-medium mb-1">Focus Tracks:</p>
                          <div className="flex flex-wrap gap-1">
                            {student.interests.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-medium border border-neutral-200"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {student.bio && (
                        <p className="text-neutral-600 text-[11px] pt-1.5 border-t border-neutral-100 italic leading-relaxed">
                          "{student.bio}"
                        </p>
                      )}

                      <div className="pt-1 text-[10px] text-neutral-400 flex items-center justify-between">
                        <span>Applied: {formatDate(student.applied_at || student.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleRejectStudent(student.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleVerifyStudent(student.id)}
                      className="btn-primary text-xs py-1.5 px-4 font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verify & Grant Access
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE ROSTER & ROLES */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="voodoo-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs">
              {['All', 'super_admin', 'admin', 'member'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                    roleFilter === r ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {r === 'All' ? 'All Roles' : r.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search verified members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          <div className="voodoo-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Verified Profile</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Student ID</th>
                    <th className="px-6 py-3.5">Leaderboard</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5 text-right">Role Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredRoster.map((m) => {
                    const isSelf = m.id === user?.id;
                    const isSuper = m.role === 'super_admin';
                    const isVisibleOnLeaderboard = m.show_on_leaderboard !== false;

                    return (
                      <tr key={m.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                              alt={m.full_name}
                              className="w-8 h-8 rounded-full object-cover border border-neutral-200"
                            />
                            <div>
                              <span className="font-semibold text-neutral-900 block">
                                {m.full_name} {isSelf && '(You)'}
                              </span>
                              <span className="text-[10px] text-neutral-400">
                                {m.is_verified ? 'Verified Member' : 'Pending Verification'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-neutral-600">{m.email}</td>
                        <td className="px-6 py-3.5 text-neutral-600">{m.department || 'Engineering'}</td>
                        <td className="px-6 py-3.5 text-neutral-500 font-mono">{m.student_id || 'ID-NA'}</td>
                        <td className="px-6 py-3.5">
                          <button
                            type="button"
                            onClick={() => toggleLeaderboard(m.id, !isVisibleOnLeaderboard)}
                            title={isVisibleOnLeaderboard ? 'Visible on Leaderboard. Click to hide.' : 'Hidden from Leaderboard. Click to show.'}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                              isVisibleOnLeaderboard
                                ? 'bg-success-50 text-success-700 border border-success-200 hover:bg-success-100'
                                : 'bg-neutral-100 text-neutral-500 border border-neutral-300 hover:bg-neutral-200'
                            }`}
                          >
                            {isVisibleOnLeaderboard ? <Eye className="w-3.5 h-3.5 text-success-600" /> : <EyeOff className="w-3.5 h-3.5 text-neutral-400" />}
                            <span>{isVisibleOnLeaderboard ? 'Visible' : 'Hidden'}</span>
                          </button>
                        </td>
                        <td className="px-6 py-3.5">
                          <RoleBadge role={m.role} size="xs" />
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {isSuper ? (
                            <span className="text-[11px] text-neutral-400 italic">Admin (Lead)</span>
                          ) : m.role === 'admin' ? (
                            <button
                              onClick={() => handleOpenRoleModal(m, 'member')}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-danger-50 text-danger-700 hover:bg-danger-100 border border-danger-200 transition-colors"
                            >
                              Demote to Member
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenRoleModal(m, 'admin')}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-warning-50 text-warning-700 hover:bg-warning-100 border border-warning-200 transition-colors"
                            >
                              Promote to Admin
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Role Modification */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmRoleChange}
        title={targetRole === 'admin' ? 'Promote Member to Admin' : 'Demote Admin to Member'}
        message={
          targetRole === 'admin'
            ? `Are you sure you want to promote ${selectedUser?.full_name} to Club Admin? They will receive permissions to publish announcements, create events, and upload resources.`
            : `Are you sure you want to revert ${selectedUser?.full_name} to a standard Member? Their admin publishing access will be immediately revoked by Supabase RLS.`
        }
        confirmLabel={targetRole === 'admin' ? 'Yes, Promote to Admin' : 'Yes, Demote to Member'}
        isDanger={targetRole === 'member'}
      />
    </div>
  );
}

export default MembersAdminPage;
