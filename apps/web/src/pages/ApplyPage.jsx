import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockDb, supabase } from '@atc/shared/supabaseClient';
import {
  Sparkles,
  CheckCircle2,
  Send,
  ArrowRight,
  ShieldCheck,
  User,
  Mail,
  Building,
  CreditCard,
  Github,
  Clock
} from 'lucide-react';

export function ApplyPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [year, setYear] = useState('Freshman (Year 1)');
  const [github, setGithub] = useState('');
  const [tracks, setTracks] = useState(['Full-Stack & Mobile']);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [appId, setAppId] = useState('');

  const toggleTrack = (trackName) => {
    if (tracks.includes(trackName)) {
      setTracks(tracks.filter((t) => t !== trackName));
    } else {
      setTracks([...tracks, trackName]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const generatedId = `ATC-APP-${Math.floor(10000 + Math.random() * 90000)}`;
    const newProfile = {
      id: `user-${Date.now()}`,
      full_name: fullName.trim(),
      email: email.trim(),
      student_id: studentId.trim(),
      department,
      role: 'member',
      bio: `${year} student interested in ${tracks.join(', ')}. ${reason}`,
      avatar_url: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`,
      is_verified: false,
      verification_status: 'pending',
      applied_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (supabase.isMock) {
      mockDb.storage.profiles.push(newProfile);
    }

    setAppId(generatedId);
    setSubmitted(true);
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details */}
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
                    University Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
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
                    Department *
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 bg-white"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Data Science & AI">Data Science & AI</option>
                    <option value="Electrical & Computer Engineering">Electrical & Computer Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Other STEM">Other STEM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            {/* Division Preferences */}
            <div className="space-y-4 pt-4 border-t border-neutral-100">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100 flex items-center gap-2">
                <Building className="w-4 h-4 text-primary-500" />
                2. Division & Track Interests
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {['AI & Machine Learning', 'Full-Stack & Mobile', 'Cloud & DevOps', 'Systems & Security'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTrack(t)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors flex items-center justify-between ${
                      tracks.includes(t)
                        ? 'bg-primary-50 border-primary-300 text-primary-800'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <span>{t}</span>
                    {tracks.includes(t) && <CheckCircle2 className="w-4 h-4 text-primary-600" />}
                  </button>
                ))}
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
                <p className="font-bold text-neutral-900">Verification Notice</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Your application will be submitted for verification. Upon approval by Club Admin, your account will gain access to the internal club portal and Android APK.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="btn-primary text-sm px-8 py-3 font-bold flex items-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" /> Submit Application
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ApplyPage;
