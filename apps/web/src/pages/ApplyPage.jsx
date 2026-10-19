import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { getSupabaseClient, mockDb, supabase } from '@atc/shared/supabaseClient';
import {
  Sparkles,
  CheckCircle2,
  Send,
  ArrowRight,
  ShieldCheck,
  User,
  Mail,
  CreditCard,
  Github,
  Clock,
  Layers,
  Check
} from 'lucide-react';

const INTEREST_OPTIONS = [
  { id: 'ai-ml', label: 'AI & Machine Learning', icon: '🤖', category: 'Intelligence' },
  { id: 'llm-agents', label: 'LLMs & AI Autonomous Agents', icon: '🧠', category: 'Intelligence' },
  { id: 'fullstack', label: 'Full-Stack Web Development', icon: '🌐', category: 'Software' },
  { id: 'mobile-dev', label: 'Mobile App Engineering (React Native / iOS / Android)', icon: '📱', category: 'Software' },
  { id: 'cloud-devops', label: 'Cloud Architecture & DevOps (AWS / Docker)', icon: '☁️', category: 'Infrastructure' },
  { id: 'cybersecurity', label: 'Cybersecurity & Ethical Hacking', icon: '🛡️', category: 'Security' },
  { id: 'systems-rust', label: 'Systems & Low-Level Programming (Rust / C++)', icon: '⚡', category: 'Systems' },
  { id: 'game-dev', label: 'Game Design & Computer Graphics', icon: '🎮', category: 'Creative' },
  { id: 'robotics-iot', label: 'Robotics, IoT & Embedded Hardware', icon: '📡', category: 'Hardware' },
  { id: 'ui-ux', label: 'UI/UX Design & Frontend Systems', icon: '🎨', category: 'Design' },
  { id: 'data-science', label: 'Data Science & Big Data Analytics', icon: '📊', category: 'Data' },
  { id: 'cp-dsa', label: 'Competitive Programming & DSA', icon: '🏆', category: 'Algorithms' },
  { id: 'blockchain', label: 'Blockchain, Web3 & Smart Contracts', icon: '⛓️', category: 'Web3' },
  { id: 'open-source', label: 'Open Source Software & Tooling', icon: '🚀', category: 'Community' }
];

export function ApplyPage() {
  const navigate = useNavigate();
  const { user, firebaseUser, token, signInWithGoogle, updateUserProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || firebaseUser?.displayName || '');
  const [email, setEmail] = useState(user?.email || firebaseUser?.email || '');
  const [studentId, setStudentId] = useState(user?.student_id || '');
  const [year, setYear] = useState('Freshman (Year 1)');
  const [github, setGithub] = useState('');
  const [tracks, setTracks] = useState(['Full-Stack Web Development', 'AI & Machine Learning']);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appId, setAppId] = useState('');

  // Auto-fill email and name from authenticated Firebase/Google account directly
  useEffect(() => {
    if (user?.email || firebaseUser?.email) {
      setEmail(user?.email || firebaseUser?.email || '');
    }
    if (user?.full_name || firebaseUser?.displayName) {
      setFullName((prev) => prev || user?.full_name || firebaseUser?.displayName || '');
    }
  }, [user, firebaseUser]);

  const toggleTrack = (trackName) => {
    if (tracks.includes(trackName)) {
      setTracks(tracks.filter((t) => t !== trackName));
    } else {
      setTracks([...tracks, trackName]);
    }
  };

  const handleGoogleFastTrack = async () => {
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res?.user) {
        setEmail(res.user.email || '');
        setFullName(res.user.displayName || res.user.email?.split('@')[0] || '');
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.warn('[ATC Apply] Google sign in failed:', err);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const generatedId = `ATC-APP-${Math.floor(10000 + Math.random() * 90000)}`;

    const applicationProfile = {
      full_name: fullName.trim(),
      email: email.trim(),
      student_id: studentId.trim(),
      department: 'Computer Science & Engineering', // All students are of the same department
      bio: `${year} student · Interests: ${tracks.join(', ')}. ${reason.trim()}`,
      interests: tracks,
      github_url: github.trim(),
      role: 'member',
      avatar_url:
        user?.avatar_url ||
        firebaseUser?.photoURL ||
        `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`,
      is_verified: false,
      verification_status: 'pending',
      applied_at: new Date().toISOString()
    };

    // Update in-memory session
    if (updateUserProfile) {
      updateUserProfile(applicationProfile);
    }

    // Save to database
    try {
      if (token) {
        const client = getSupabaseClient(token);
        if (client) {
          await client
            .from('profiles')
            .update(applicationProfile)
            .eq('id', user?.id || firebaseUser?.uid);
        }
      } else if (mockDb?.storage?.profiles) {
        mockDb.storage.profiles.push({
          id: user?.id || `user-${Date.now()}`,
          ...applicationProfile,
          created_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('[ATC Apply] Data persist note:', err);
    }

    setAppId(generatedId);
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary-500" />
          <span>Membership Enrollment</span>
        </div>
        <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
          Apply to Advanced Tech Club
        </h1>
        <p className="text-sm text-neutral-500 mt-2">
          Join a dedicated community of student software builders. Applications are reviewed and verified by Club Admin (Ritesh Mishra).
        </p>
      </div>

      {submitted ? (
        <div className="voodoo-card p-8 sm:p-10 text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-success-50 text-success-600 rounded-2xl flex items-center justify-center mx-auto border border-success-200 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-neutral-900">Application Submitted!</h2>
            <p className="text-sm text-neutral-600 max-w-md mx-auto">
              Thank you, <strong>{fullName}</strong>. Your membership application has been received and routed to Club Admin (Ritesh Mishra) for student verification.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 max-w-sm mx-auto text-xs space-y-1">
            <p className="text-neutral-500">Application Reference ID:</p>
            <p className="text-lg font-mono font-bold text-primary-600">{appId}</p>
            <p className="text-[11px] text-neutral-400">Save this ID to check your verification status</p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/verification-status"
              className="btn-primary text-xs py-2.5 px-5 font-bold"
            >
              Check Verification Status
            </Link>
            <Link
              to="/"
              className="btn-secondary text-xs py-2.5 px-5"
            >
              Back to Public Homepage
            </Link>
          </div>
        </div>
      ) : (
        <div className="voodoo-card p-6 sm:p-8">
          {/* Optional 1-Tap Google Sign-In Banner if not signed in */}
          {!user && !firebaseUser && (
            <div className="mb-6 p-4 rounded-2xl bg-primary-50/70 border border-primary-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-primary-200 flex items-center justify-center shadow-xs shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">Sign in with Google to prefill application</p>
                  <p className="text-[11px] text-neutral-600">Authenticate with 1 tap — your verified email and name will be populated.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleFastTrack}
                disabled={googleLoading}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 text-xs font-bold shadow-xs transition-colors shrink-0 flex items-center justify-center gap-2"
              >
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100 flex items-center gap-2">
                <User className="w-4 h-4 text-primary-500" />
                1. Student Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tyler Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
                  {email && (
                    <p className="text-[11px] text-success-700 mt-1 flex items-center gap-1 font-medium">
                      ✓ Direct contact email (no university domain restriction required)
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Student ID Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS2026-089"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Current Academic Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 bg-white"
                  >
                    <option value="Freshman (Year 1)">Freshman (Year 1)</option>
                    <option value="Sophomore (Year 2)">Sophomore (Year 2)</option>
                    <option value="Junior (Year 3)">Junior (Year 3)</option>
                    <option value="Senior (Year 4)">Senior (Year 4)</option>
                    <option value="Graduate / Masters">Graduate / Masters</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  GitHub Profile (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/username"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* Division & Interests Preferences */}
            <div className="space-y-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary-500" />
                  2. Technical Interests & Specializations ({tracks.length} selected)
                </h3>
                <span className="text-[11px] text-neutral-400">Select all areas you want to build in</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2.5">
                {INTEREST_OPTIONS.map((item) => {
                  const isSelected = tracks.includes(item.label);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleTrack(item.label)}
                      className={`p-3 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-primary-50/90 border-primary-400 text-primary-900 shadow-xs'
                          : 'bg-neutral-50/60 border-neutral-200 text-neutral-700 hover:bg-neutral-100/80 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0">{item.icon}</span>
                        <div className="truncate">
                          <p className="text-xs font-semibold truncate leading-tight">{item.label}</p>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">{item.category}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                          isSelected
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-neutral-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2 pt-4 border-t border-neutral-100">
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Why do you want to join ATC? What are you excited to build? *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Share your goals, previous project experience, or topics you want to explore..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
              />
            </div>

            {/* Disclaimer & Verification notice */}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-neutral-900">Student Verification Notice</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  All engineering student applications are reviewed and verified by Club Admin (Ritesh Mishra). Once verified, you will receive full access to the internal campus portal and workshops.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary text-sm px-8 py-3 font-bold flex items-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit Membership Application'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ApplyPage;
