import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { getPublicSiteUrl } from '@atc/shared/utils/domains';
import {
  Clock,
  ArrowLeft,
  LogOut,
  Search
} from 'lucide-react';

export function VerificationGate({ children }) {
  const { user, isVerified, loading, signOut } = useAuth();

  // 1. If auth session is still initializing from Firebase, display clean spinner
  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50 font-voodoo">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-neutral-600">Verifying Club Session...</p>
        </div>
      </div>
    );
  }

  // 2. If user is NOT logged in, redirect directly to Login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. If user is verified, grant full access to internal club portal
  if (isVerified) {
    return <>{children}</>;
  }

  // 4. If logged in but student application is legitimately pending admin verification
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 font-voodoo">
      <div className="max-w-xl w-full voodoo-card p-8 sm:p-10 space-y-6 text-center border-warning-200 bg-white shadow-md">
        {/* Amber Clock Icon */}
        <div className="w-16 h-16 bg-warning-50 text-warning-700 rounded-2xl flex items-center justify-center mx-auto border border-warning-200">
          <Clock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-warning-100 text-warning-800 border border-warning-200">
            <span>⏳ Access Restricted · Pending Verification</span>
          </div>

          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Application Under Admin Review
          </h2>

          <p className="text-sm text-neutral-600 leading-relaxed max-w-md mx-auto">
            Welcome, <strong>{user?.full_name || user?.email}</strong>. Because club resources and event check-ins are restricted to active members, all applications are verified by Club Admin <strong>Ritesh Mishra</strong>.
          </p>
        </div>

        {/* Student Details Card */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-left text-xs space-y-2 max-w-md mx-auto">
          <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
            <span className="text-neutral-500 font-medium">Student Name:</span>
            <span className="font-bold text-neutral-900">{user?.full_name || 'Registered Applicant'}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
            <span className="text-neutral-500 font-medium">Student ID:</span>
            <span className="font-mono font-bold text-neutral-800">{user?.student_id || 'Pending ID Submission'}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
            <span className="text-neutral-500 font-medium">Department:</span>
            <span className="text-neutral-700">{user?.department || 'Computer Science & Engineering'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-500 font-medium">Status:</span>
            <span className="font-bold text-warning-700">Awaiting Verification Review</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/verification-status"
            className="w-full sm:w-auto btn-primary text-xs py-2.5 px-5 flex items-center justify-center gap-1.5 font-bold shadow-sm"
          >
            <Search className="w-4 h-4" /> Check Application Status
          </Link>
          <a
            href={getPublicSiteUrl('/')}
            className="w-full sm:w-auto btn-outline text-xs py-2.5 px-5 flex items-center justify-center gap-1.5 font-semibold text-neutral-700 hover:text-neutral-900"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Public Site
          </a>
        </div>

        <div className="pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-danger-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out / Switch account</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerificationGate;
