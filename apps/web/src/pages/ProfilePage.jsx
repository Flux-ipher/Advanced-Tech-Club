import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useEvents } from '@atc/shared/hooks/useEvents';
import { RoleBadge } from '../components/RoleBadge';
import { Modal } from '../components/Modal';
import { ImageUploader } from '../components/ImageUploader';
import { formatDateTime, formatDate } from '@atc/shared/utils/formatters';
import {
  User,
  Mail,
  Building,
  CreditCard,
  Calendar,
  Bell,
  Shield,
  Save,
  CheckCircle,
  ExternalLink,
  Smartphone,
  QrCode,
  Download,
  Printer,
  Sparkles,
  LogOut
} from 'lucide-react';

export function ProfilePage() {
  const { user, updateUserProfile, isSuperAdmin, isAdmin, signOut } = useAuth();
  const { events, userRegistrations, unregister } = useEvents();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [studentId, setStudentId] = useState(user?.student_id || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  // Filter events registered by current user
  const myRegisteredEvents = events.filter((e) =>
    userRegistrations.some((r) => r.event_id === e.id)
  );

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateUserProfile({
      full_name: fullName,
      department,
      student_id: studentId,
      bio,
      avatar_url: avatarUrl
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Overview Card */}
      <div className="voodoo-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative group">
            <img
              src={
                avatarUrl ||
                user?.avatar_url ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
              }
              alt={user?.full_name}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-neutral-200 shadow-md ring-4 ring-primary-50"
            />
            <div className="absolute -bottom-2 -right-2">
              <RoleBadge role={user?.role} size="sm" />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
                  {user?.full_name}
                </h1>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                  {user?.department || 'Computer Science & Engineering'} · ID: {user?.student_id || 'CS2023-001'}
                </p>
              </div>

              <div className="flex items-center gap-2 self-center sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsPassModalOpen(true)}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Digital Member Pass
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 text-danger-600 hover:text-danger-700 hover:bg-danger-50 hover:border-danger-200 transition-colors"
                  title="Sign Out of ATC Platform"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-success-50 text-success-700 border border-success-200">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </span>
              </div>
            </div>

            <p className="text-sm text-neutral-600 leading-relaxed max-w-2xl">
              {user?.bio || 'Member of the Advanced Tech Club student community.'}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-neutral-400" />
                {user?.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-neutral-400" />
                Joined Oct 2026
              </span>
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-primary-500" />
                Expo Push Token Connected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Edit Profile Form + Registered Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Edit Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="voodoo-card p-6">
            <h3 className="text-base font-bold text-neutral-900 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
              <User className="w-4 h-4 text-primary-500" />
              Edit Profile Information
            </h3>

            {savedSuccess && (
              <div className="mb-4 p-3 bg-success-50 border border-success-200 text-success-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Profile saved successfully!
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  Bio / Technical Interests
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Profile Image Uploader (Strictly Images Only) */}
              <div className="pt-2 border-t border-neutral-100">
                <ImageUploader
                  mode="avatar"
                  label="Profile Picture / Avatar"
                  helperText="Upload your real photo or avatar (PNG, JPG, WEBP, GIF up to 5MB). Other file types are prohibited."
                  value={avatarUrl}
                  onChange={(newAvatar) => setAvatarUrl(newAvatar)}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button type="submit" className="btn-primary text-sm flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Profile
                </button>
              </div>
            </form>
          </div>

          {/* Registered Events Section */}
          <div className="voodoo-card p-6">
            <h3 className="text-base font-bold text-neutral-900 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-500" />
                My Registered Events ({myRegisteredEvents.length})
              </span>
            </h3>

            {myRegisteredEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                You haven't registered for any events yet. Check out the Events catalog!
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 space-y-3">
                {myRegisteredEvents.map((evt) => (
                  <div key={evt.id} className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                        {evt.category}
                      </span>
                      <h4 className="text-sm font-bold text-neutral-900 mt-1">{evt.title}</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {formatDateTime(evt.start_at)} · {evt.location}
                      </p>
                    </div>

                    <button
                      onClick={() => unregister(evt.id)}
                      className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-danger-50 text-danger-700 hover:bg-danger-100 border border-danger-200 transition-colors whitespace-nowrap"
                    >
                      Cancel RSVP
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Mobile App & Permissions */}
        <div className="space-y-6">
          {/* Mobile Companion App Card */}
          <div className="voodoo-card p-5 bg-gradient-to-br from-primary-900 to-neutral-950 text-white border-primary-800 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-primary-400" />
                Android Companion App
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30">
                v1.4.0 APK
              </span>
            </div>

            <h4 className="text-base font-bold text-white mb-1.5">
              ATC Mobile Hub
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed mb-4">
              Take the club with you. Check into workshops with your digital pass, get instant push alerts, and browse the vault offline.
            </p>

            <a
              href="/atc-release.apk"
              download="atc-release.apk"
              className="w-full btn-primary text-xs py-2 px-3 flex items-center justify-center gap-2 shadow-sm font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              Download Standalone APK (64MB)
            </a>
            <p className="text-[10px] text-neutral-400 text-center mt-2">
              Standalone Release · No Metro or Google Play Required
            </p>
          </div>

          {/* Role & Permissions Card */}
          <div className="voodoo-card p-5">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-warning-600" />
              Role & Permissions
            </h4>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                <p className="text-neutral-500">Current Role Tier:</p>
                <div className="mt-1 flex items-center gap-2">
                  <RoleBadge role={user?.role} size="md" />
                </div>
              </div>

              <div className="space-y-2 text-neutral-600 text-[11px] leading-relaxed">
                <p>
                  • <strong>Announcements:</strong> {isAdmin ? 'Can post & pin notices' : 'View only'}
                </p>
                <p>
                  • <strong>Events:</strong> {isAdmin ? 'Create, edit & export rosters' : 'RSVP & attendee roster'}
                </p>
                <p>
                  • <strong>Resources:</strong> {isAdmin ? 'Upload & manage files' : 'Download access'}
                </p>
                <p>
                  • <strong>Member Roles:</strong> {isSuperAdmin ? 'Full promotion & revocation control' : 'Restricted'}
                </p>
              </div>
            </div>
          </div>

          {/* Push Notification Preferences */}
          <div className="voodoo-card p-5 space-y-4">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-primary-500" />
              Notification Settings
            </h4>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-neutral-700">New Announcements Push</span>
                <input type="checkbox" defaultChecked className="rounded text-primary-500 w-4 h-4" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-neutral-700">Workshop & Event Reminders</span>
                <input type="checkbox" defaultChecked className="rounded text-primary-500 w-4 h-4" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-neutral-700">Resource Library Updates</span>
                <input type="checkbox" defaultChecked className="rounded text-primary-500 w-4 h-4" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Digital Member ID & QR Check-in Pass Modal */}
      {isPassModalOpen && (
        <Modal
          isOpen={isPassModalOpen}
          onClose={() => setIsPassModalOpen(false)}
          title="Digital Campus Member ID & Entry Pass"
          maxWidth="max-w-md"
        >
          <div className="space-y-5">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-primary-950 text-white shadow-xl border border-neutral-700 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center font-black text-white text-xs">
                    ATC
                  </span>
                  <div>
                    <h3 className="text-xs font-bold tracking-tight text-white leading-tight">
                      ADVANCED TECH CLUB
                    </h3>
                    <p className="text-[10px] text-neutral-400">STUDENT INNOVATION HUB</p>
                  </div>
                </div>

                <RoleBadge role={user?.role} size="sm" />
              </div>

              <div className="flex items-center gap-4 py-3 border-y border-neutral-800">
                <img
                  src={
                    user?.avatar_url ||
                    avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
                  }
                  alt={user?.full_name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-primary-500"
                />
                <div>
                  <h4 className="text-base font-bold text-white">{user?.full_name}</h4>
                  <p className="text-xs text-primary-300 font-mono mt-0.5">
                    {user?.student_id || 'CS2023-001'}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {user?.department || 'Computer Science & Engineering'}
                  </p>
                </div>
              </div>

              {/* High-density QR Matrix Simulation */}
              <div className="pt-4 flex flex-col items-center">
                <div className="p-3 bg-white rounded-xl shadow-inner border border-neutral-200">
                  <div className="w-40 h-40 grid grid-cols-10 gap-0.5 p-1 bg-white">
                    {Array.from({ length: 100 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-full h-full rounded-[1px] ${
                          (i % 2 === 0 && i % 3 === 0) ||
                          (i < 30 && i % 7 === 0) ||
                          i % 5 === 0 ||
                          i === 42 ||
                          i === 55 ||
                          i === 88
                            ? 'bg-neutral-900'
                            : 'bg-white'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] font-mono text-neutral-400 mt-2">
                  PASS-TOKEN: {user?.id || 'usr-ritesh-admin'}-2026-ATC
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-success-400">
                  <CheckCircle className="w-3 h-3 text-success-400" />
                  AUTHENTICATED CAMPUS MEMBER · SPRING 2026
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsPassModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Done
              </button>

              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save Pass
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ProfilePage;
