import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { initialProfiles } from '@atc/shared/mockData';
import { mockDb, supabase } from '@atc/shared/supabaseClient';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  UserCheck
} from 'lucide-react';

export function VerificationStatusPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const allProfiles = supabase.isMock
      ? mockDb.storage.profiles
      : initialProfiles;

    const matched = allProfiles.find(
      (p) =>
        p.email?.toLowerCase() === query.trim().toLowerCase() ||
        p.student_id?.toLowerCase() === query.trim().toLowerCase() ||
        p.full_name?.toLowerCase() === query.trim().toLowerCase()
    );

    setResult(matched || null);
    setHasSearched(true);
  };

  const quickCheck = (sampleQuery) => {
    setQuery(sampleQuery);
    const allProfiles = supabase.isMock
      ? mockDb.storage.profiles
      : initialProfiles;
    const matched = allProfiles.find(
      (p) =>
        p.student_id?.toLowerCase() === sampleQuery.toLowerCase() ||
        p.email?.toLowerCase() === sampleQuery.toLowerCase()
    );
    setResult(matched || null);
    setHasSearched(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto border border-primary-200">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
          Membership Verification Status
        </h1>
        <p className="text-xs text-neutral-500 max-w-md mx-auto">
          Look up your student application to check if Club Admin (Ritesh Mishra) has approved your club portal access.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="voodoo-card p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
              Enter Student ID or University Email
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="e.g. ECE2026-077 or applicant email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full btn-primary text-sm py-2.5 font-bold shadow-sm"
          >
            Check Status
          </button>
        </form>

        {/* Quick sample chips */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          <span className="font-medium">Try checking sample applicants:</span>
          <button
            type="button"
            onClick={() => quickCheck('ECE2026-077')}
            className="px-2 py-0.5 rounded bg-warning-50 text-warning-700 border border-warning-200 font-mono hover:bg-warning-100"
          >
            ECE2026-077 (Tyler Smith - Pending)
          </button>
          <button
            type="button"
            onClick={() => quickCheck('CS2025-204')}
            className="px-2 py-0.5 rounded bg-success-50 text-success-700 border border-success-200 font-mono hover:bg-success-100"
          >
            CS2025-204 (Priya Patel - Verified)
          </button>
        </div>
      </div>

      {/* Results View */}
      {hasSearched && (
        <div className="animate-in fade-in duration-200">
          {result ? (
            <div className="voodoo-card p-6 sm:p-8 space-y-6">
              {result.is_verified ? (
                /* Verified State */
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-success-50 text-success-600 rounded-xl border border-success-200 shrink-0">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-neutral-900">{result.full_name}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-success-100 text-success-800 border border-success-200">
                          ✓ Verified Member
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {result.department} · Student ID: {result.student_id}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-success-50/50 border border-success-200 text-xs text-success-800 space-y-1">
                    <p className="font-semibold">Access Granted by Club Admin</p>
                    <p className="text-success-700">
                      Your credentials are confirmed! You now have full access to the internal Club Portal, real-time broadcasts, and 1-tap workshop reservations.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Link
                      to="/portal"
                      className="w-full btn-primary text-sm py-2.5 flex items-center justify-center gap-2 font-bold"
                    >
                      Enter Club Portal <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                /* Pending Verification State */
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-warning-50 text-warning-700 rounded-xl border border-warning-200 shrink-0">
                      <Clock className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-neutral-900">{result.full_name}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-warning-100 text-warning-800 border border-warning-200">
                          ⏳ Pending Verification
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {result.department} · Student ID: {result.student_id}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-warning-50/50 border border-warning-200 text-xs text-warning-800 space-y-1">
                    <p className="font-semibold">Application Under Active Review</p>
                    <p className="text-warning-700 leading-relaxed">
                      Your registration was received and is currently waiting for Club Admin verification review. You will be able to access the internal club portal as soon as it is approved.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-100 rounded-lg text-xs text-neutral-600">
                    💡 <strong>Demo Testing Tip:</strong> Switch to <strong>Ritesh Mishra (Admin)</strong> in the top-right role switcher to review and approve this pending application right now!
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="voodoo-card p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-neutral-400 mx-auto" />
              <h3 className="text-base font-bold text-neutral-800">No Application Found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                We couldn't find a registration matching "{query}". Check your spelling or submit a new application below.
              </p>
              <div className="pt-2">
                <Link to="/apply" className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold">
                  Submit New Application <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VerificationStatusPage;
