import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useMembers } from '@atc/shared/hooks/useMembers';
import { useTasks } from '@atc/shared/hooks/useTasks';
import { RoleBadge } from '../components/RoleBadge';
import { Modal } from '../components/Modal';
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
  EyeOff,
  Camera,
  Plus,
  Send,
  Calendar,
  Trash2,
  Award,
  CheckSquare,
  FileText
} from 'lucide-react';

export function MembersAdminPage() {
  const { user, isSuperAdmin } = useAuth();
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

  const {
    tasks,
    loading: tasksLoading,
    createTask,
    reviewTask,
    removeTask
  } = useTasks();

  const [activeTab, setActiveTab] = useState('verifications'); // 'verifications' | 'roster' | 'tasks'
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  // Role Change Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [targetRole, setTargetRole] = useState('member');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Assign Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskRole, setTaskRole] = useState('media_head');
  const [taskUserId, setTaskUserId] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskPoints, setTaskPoints] = useState('50');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Review Task Modal state
  const [selectedTaskToReview, setSelectedTaskToReview] = useState(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewAwardPoints, setReviewAwardPoints] = useState('50');

  if (!isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 voodoo-card text-center space-y-4">
        <div className="w-12 h-12 bg-danger-50 text-danger-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">Admin Access Only</h2>
        <p className="text-sm text-neutral-500">
          Only the Club Admin (<strong>Ritesh Mishra</strong>) has permission to verify student applicants, assign club roles, and manage task assignments.
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

  const handleOpenRoleModal = (memberUser) => {
    if (memberUser.role === 'super_admin') {
      alert('The Super Admin role cannot be modified.');
      return;
    }
    setSelectedUser(memberUser);
    setTargetRole(memberUser.role || 'member');
    setIsRoleModalOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return;
    try {
      await changeMemberRole(selectedUser.id, targetRole);
      setActionSuccess(`Updated ${selectedUser.full_name}'s role to ${targetRole === 'media_head' ? 'Media Head' : targetRole.toUpperCase()}.`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      alert(err.message || 'Error updating role');
    } finally {
      setIsRoleModalOpen(false);
      setSelectedUser(null);
    }
  };

  const handleOpenAssignTaskForUser = (memberUser = null) => {
    if (memberUser) {
      setTaskUserId(memberUser.id);
      setTaskRole(memberUser.role === 'media_head' ? 'media_head' : 'member');
    } else {
      setTaskUserId('');
      setTaskRole('media_head');
    }
    setTaskTitle('');
    setTaskDesc('');
    setTaskPriority('medium');
    setTaskPoints('50');
    setTaskDueDate('');
    setIsTaskModalOpen(true);
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      const assignedMember = members.find((m) => m.id === taskUserId);
      await createTask({
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        assigned_to_role: taskRole,
        assigned_to_user_id: taskUserId || null,
        assigned_to_user_name: assignedMember?.full_name || (taskRole === 'media_head' ? 'Media Head' : 'Any Member'),
        assigned_by: user?.id,
        assigned_by_name: user?.full_name || 'Club Admin',
        priority: taskPriority,
        points_reward: parseInt(taskPoints, 10) || 50,
        due_date: taskDueDate ? new Date(taskDueDate).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      setActionSuccess(`Assigned new task "${taskTitle.trim()}" successfully!`);
      setTimeout(() => setActionSuccess(''), 4000);
      setIsTaskModalOpen(false);
    } catch (err) {
      alert(err.message || 'Error creating task');
    }
  };

  const handleApproveTask = async (task) => {
    try {
      await reviewTask(user?.id, task.id, {
        status: 'completed',
        adminFeedback: reviewFeedback.trim() || 'Great work on fulfilling this deliverable!',
        pointsAwarded: parseInt(reviewAwardPoints, 10) || task.points_reward,
        targetUserId: task.assigned_to_user_id,
        title: task.title
      });

      setActionSuccess(`Approved deliverable and awarded ${reviewAwardPoints} XP to ${task.assigned_to_user_name || 'assignee'}!`);
      setTimeout(() => setActionSuccess(''), 4000);
      setSelectedTaskToReview(null);
      setReviewFeedback('');
    } catch (err) {
      alert(err.message || 'Error approving task');
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
            Role Delegation & Task Management
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Assign functional roles like Media Head, manage membership applications, and dispatch deliverables.
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
      <div className="flex border-b border-neutral-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
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
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'roster'
              ? 'border-primary-500 text-primary-600 bg-primary-50/30'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Active Roster & Roles ({verifiedCount})
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'tasks'
              ? 'border-primary-500 text-primary-600 bg-primary-50/30'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Role Tasks Hub ({tasks.length})
        </button>
      </div>

      {/* TAB 1: PENDING VERIFICATIONS */}
      {activeTab === 'verifications' && (
        <div className="space-y-4">
          {pendingCount === 0 ? (
            <div className="voodoo-card p-12 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-success-500 mx-auto" />
              <h3 className="text-base font-bold text-neutral-800">All caught up!</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                There are no student applicants waiting for verification right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingMembers.map((student) => (
                <div
                  key={student.id}
                  className="voodoo-card p-5 flex flex-col justify-between hover:border-neutral-300 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-neutral-900 text-base">{student.full_name}</h4>
                        <p className="text-xs text-neutral-500">{student.email}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning-50 text-warning-700 border border-warning-200">
                        Review Pending
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs border-t border-neutral-100 pt-3">
                      <div className="flex items-center justify-between text-neutral-600">
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
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs overflow-x-auto">
              {['All', 'super_admin', 'admin', 'media_head', 'member'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1 rounded-md font-medium capitalize transition-colors whitespace-nowrap ${
                    roleFilter === r ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {r === 'All' ? 'All Roles' : r === 'media_head' ? 'Media Head' : r.replace('_', ' ')}
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
                    <th className="px-6 py-3.5">Assigned Role</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
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
                            <span className="text-[11px] text-neutral-400 italic">Super Admin</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenRoleModal(m)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-300 transition-colors"
                              >
                                Set Role ▾
                              </button>
                              <button
                                onClick={() => handleOpenAssignTaskForUser(m)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 transition-colors"
                              >
                                + Task
                              </button>
                            </div>
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

      {/* TAB 3: ROLE TASKS & ASSIGNMENTS */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 voodoo-card p-4">
            <div>
              <h3 className="font-bold text-neutral-900 text-base">Delegated Role Tasks ({tasks.length})</h3>
              <p className="text-xs text-neutral-500">
                Dispatch deliverables to Media Head and club members. Review submissions and award XP points upon completion.
              </p>
            </div>
            <button
              onClick={() => handleOpenAssignTaskForUser(null)}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-2 self-start sm:self-auto font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" /> Assign New Task
            </button>
          </div>

          {tasksLoading ? (
            <div className="p-8 text-center text-xs text-neutral-400">Loading assigned tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="voodoo-card p-12 text-center space-y-3">
              <CheckSquare className="w-10 h-10 text-neutral-300 mx-auto" />
              <h3 className="text-base font-bold text-neutral-800">No Assigned Tasks</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Assign tasks to Media Head or other team members to keep club initiatives organized.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => {
                const isMedia = task.assigned_to_role === 'media_head';
                const isSubmitted = task.status === 'submitted';
                const isCompleted = task.status === 'completed';

                return (
                  <div
                    key={task.id}
                    className={`voodoo-card p-5 flex flex-col justify-between transition-all ${
                      isCompleted
                        ? 'border-success-200 bg-success-50/10'
                        : isSubmitted
                        ? 'border-warning-300 bg-warning-50/10'
                        : 'hover:border-neutral-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isMedia
                                  ? 'bg-violet-100 text-violet-800 border border-violet-200'
                                  : 'bg-primary-50 text-primary-700 border border-primary-200'
                              }`}
                            >
                              {isMedia ? 'Media Head' : task.assigned_to_role}
                            </span>
                            <span className="text-[11px] text-neutral-500 font-medium">
                              Assignee: <strong className="text-neutral-800">{task.assigned_to_user_name || 'Role Assigned'}</strong>
                            </span>
                          </div>
                          <h4 className="font-bold text-neutral-900 text-base">{task.title}</h4>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isCompleted
                              ? 'bg-success-100 text-success-800'
                              : isSubmitted
                              ? 'bg-warning-100 text-warning-800'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>

                      {task.description ? (
                        <p className="text-xs text-neutral-600 leading-relaxed">{task.description}</p>
                      ) : null}

                      {/* Meta pills */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 border-t border-neutral-100 pt-2.5">
                        <span className="flex items-center gap-1 font-bold text-primary-600">
                          <Award className="w-3.5 h-3.5" /> +{task.points_reward} XP Bounty
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          Due: {formatDate(task.due_date)}
                        </span>
                        <span className="font-medium capitalize text-neutral-400">
                          Priority: {task.priority}
                        </span>
                      </div>

                      {/* Submitted Deliverables Banner */}
                      {task.deliverable_url ? (
                        <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                            <span>Submitted Work:</span>
                            <a
                              href={task.deliverable_url.startsWith('http') ? task.deliverable_url : `https://${task.deliverable_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline inline-flex items-center gap-1 text-[11px]"
                            >
                              <span>View Deliverable Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          {task.deliverable_notes ? (
                            <p className="text-xs text-neutral-600 italic">"{task.deliverable_notes}"</p>
                          ) : null}
                          {task.admin_feedback ? (
                            <p className="text-xs text-success-700 font-semibold pt-1 border-t border-neutral-200">
                              Feedback: {task.admin_feedback}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {/* Action Bar */}
                    <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between">
                      <button
                        onClick={() => removeTask(task.id)}
                        className="text-neutral-400 hover:text-danger-600 p-1.5 rounded-lg transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {isSubmitted ? (
                        <button
                          onClick={() => {
                            setSelectedTaskToReview(task);
                            setReviewAwardPoints(String(task.points_reward || 50));
                            setReviewFeedback('');
                          }}
                          className="btn-primary text-xs py-1.5 px-3 font-bold flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Review & Award XP
                        </button>
                      ) : isCompleted ? (
                        <span className="text-xs font-bold text-success-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed (+{task.points_reward} XP)
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400 italic">Waiting for submission</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ROLE ASSIGNMENT MODAL */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={`Assign Role for ${selectedUser?.full_name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-600">
            Select a functional role for <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email}). Permissions update immediately in Supabase.
          </p>

          <div className="space-y-2.5">
            {[
              {
                id: 'member',
                title: 'Club Member',
                badge: 'General Access',
                badgeColor: 'bg-neutral-100 text-neutral-700',
                desc: 'Standard student membership. RSVP to workshops, download learning assets, view announcements, and earn XP badges.'
              },
              {
                id: 'media_head',
                title: 'Media Head',
                badge: 'Media & Posts',
                badgeColor: 'bg-violet-100 text-violet-800 border border-violet-200',
                desc: 'Controls event photos and communications. Can upload and edit Campus Gallery memories, publish club feed posts, and fulfill media tasks.'
              },
              {
                id: 'admin',
                title: 'Club Admin',
                badge: 'Executive Admin',
                badgeColor: 'bg-primary-100 text-primary-800 border border-primary-200',
                desc: 'Executive management. Can verify and decline student membership applications, create workshops, and oversee club operations.'
              }
            ].map((r) => {
              const isSelected = targetRole === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setTargetRole(r.id)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50/20 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-neutral-900 text-sm">{r.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.badgeColor}`}>
                      {r.badge}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">{r.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRoleChange}
              className="btn-primary text-xs py-2 px-5 font-bold shadow-sm"
            >
              Save Role Assignment
            </button>
          </div>
        </div>
      </Modal>

      {/* CREATE TASK MODAL */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Assign New Role Task"
      >
        <form onSubmit={handleCreateTaskSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-neutral-800 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Capture event photos, Design workshop poster..."
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-800 mb-1">Target Role</label>
              <select
                value={taskRole}
                onChange={(e) => setTaskRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 text-xs font-medium"
              >
                <option value="media_head">Media Head</option>
                <option value="member">General Member</option>
                <option value="admin">Club Admin</option>
                <option value="all">Any Club Member</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-neutral-800 mb-1">Specific Member (Optional)</label>
              <select
                value={taskUserId}
                onChange={(e) => setTaskUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 text-xs font-medium"
              >
                <option value="">Anyone with Role</option>
                {verifiedMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-neutral-800 mb-1">Deliverables & Instructions</label>
            <textarea
              rows={3}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Detail required photos, resolution, link requirements, and timeline expectations..."
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-neutral-800 mb-1">Priority</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 text-xs"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-neutral-800 mb-1">XP Points Bounty</label>
              <input
                type="number"
                min="10"
                step="10"
                value={taskPoints}
                onChange={(e) => setTaskPoints(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-800 mb-1">Due Date</label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs py-2 px-5 font-bold shadow-sm"
            >
              Dispatch Task
            </button>
          </div>
        </form>
      </Modal>

      {/* REVIEW DELIVERABLE MODAL */}
      {selectedTaskToReview && (
        <Modal
          isOpen={Boolean(selectedTaskToReview)}
          onClose={() => setSelectedTaskToReview(null)}
          title={`Review Task: ${selectedTaskToReview.title}`}
        >
          <div className="space-y-4 text-xs">
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span className="text-neutral-700">Assignee:</span>
                <span className="text-neutral-900">{selectedTaskToReview.assigned_to_user_name}</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span className="text-neutral-700">Deliverable Link:</span>
                <a
                  href={selectedTaskToReview.deliverable_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline inline-flex items-center gap-1 font-mono"
                >
                  <span>Open URL</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {selectedTaskToReview.deliverable_notes && (
                <div>
                  <span className="text-neutral-500 font-medium">Notes from Assignee:</span>
                  <p className="text-neutral-800 italic mt-0.5">"{selectedTaskToReview.deliverable_notes}"</p>
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-neutral-800 mb-1">XP Points to Award</label>
              <input
                type="number"
                min="0"
                step="10"
                value={reviewAwardPoints}
                onChange={(e) => setReviewAwardPoints(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 font-bold text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-800 mb-1">Admin Feedback / Commendation</label>
              <textarea
                rows={3}
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Awesome work on the photos, quality is great..."
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs"
              />
            </div>

            <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTaskToReview(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleApproveTask(selectedTaskToReview)}
                className="btn-primary text-xs py-2 px-5 font-bold shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve & Award XP
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default MembersAdminPage;
