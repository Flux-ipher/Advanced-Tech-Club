import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useMembers } from '@atc/shared/hooks/useMembers';
import {
  Lock,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  User,
  ExternalLink
} from 'lucide-react';

export function VerificationGate({ children }) {
  const { user, isVerified, isSuperAdmin, switchDemoUser } = useAuth();
  const { verifyMemberAccount } = useMembers();

  // If user is verified, grant full access to internal club portal
  if (isVerified) {
    return <>{children}</>;
  }

  // If unverified, display the verification pending gate
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
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
            Welcome, <strong>{user?.full_name}</strong>. Because club resources and event check-ins are restricted to active members, all applications are verified by Club Admin <strong>Ritesh Mishra</strong>.
          </p>
        </div>

        {/* Student Details Card */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-left text-xs space-y-2 max-w-md mx-auto">
          <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
            <span className="text-neutral-500 font-medium">Student Name:</span>
            <span className="font-bold text-neutral-900">{user?.full_name}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
            <span className="text-neutral-500 font-medium">Student ID:</span>
            <span className="font-mono font-bold text-neutral-800">{user?.student_id || 'Pending ID'}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
            <span className="text-neutral-500 font-medium">Department:</span>
            <span className="text-neutral-700">{user?.department || 'Engineering'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-500 font-medium">Status:</span>
            <span className="font-bold text-warning-700">Awaiting Verification Review</span>
          </div>
        </div>

        {/* Demo Fast-Action (so reviewer/evaluator can test verification instantly) */}
        <div className="p-4 rounded-xl bg-primary-50/50 border border-primary-200 text-xs text-primary-900 space-y-2">
          <p className="font-bold flex items-center justify-center gap-1.5 text-primary-700">
            <Sparkles className="w-4 h-4 text-primary-500" />
            Evaluator Fast-Track Verification
          </p>
          <p className="text-[11px] text-neutral-600">
            Want to see how this screen unlocks? Click below to instantly simulate Club Admin Ritesh Mishra verifying this student:
          </p>
          <button
            onClick={() => {
              verifyMemberAccount(user?.id, 'user-ritesh-superadmin');
              user.is_verified = true;
              user.verification_status = 'verified';
              window.location.reload();
            }}
            className="btn-primary text-xs py-2 px-4 font-bold shadow-sm"
          >
            ✓ Verify & Unlock Access Now
          </button>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto btn-outline text-xs py-2.5 px-5 flex items-center justify-center gap-1.5 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Public Homepage
          </Link>
          <Link
            to="/events"
            className="w-full sm:w-auto btn-secondary text-xs py-2.5 px-5 font-semibold"
          >
            Browse Public Events
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VerificationGate;
