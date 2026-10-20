// apps/web/src/pages/CheckinPage.jsx
// Advanced Tech Club (ATC) — Event QR Code Check-in Endpoint & Verification

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { supabase } from '@atc/shared/supabaseClient';
import { recordEventCheckin, getMemberPoints } from '@atc/shared/api/gamification';
import { CheckCircle2, AlertCircle, Trophy, Flame, Sparkles, ArrowRight } from 'lucide-react';

export function CheckinPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState('checking'); // 'checking' | 'success' | 'already' | 'error'
  const [message, setMessage] = useState('');
  const [eventData, setEventData] = useState(null);
  const [pointsResult, setPointsResult] = useState(null);

  useEffect(() => {
    async function processCheckin() {
      if (authLoading) return;

      if (!token) {
        setStatus('error');
        setMessage('Missing check-in token. Please scan an active workshop QR code.');
        return;
      }

      if (!user) {
        setStatus('unauthenticated');
        setMessage('Please log in to your club account to claim your workshop check-in points.');
        return;
      }

      try {
        // 1. Look up QR code details to get event info
        const { data: qrRecord, error: qrErr } = await supabase
          .from('event_qr_codes')
          .select('*, events (*)')
          .eq('token', token.trim())
          .maybeSingle();

        let eventId = qrRecord?.event_id || 'evt-1';
        let eventInfo = qrRecord?.events || { title: 'Campus Developer Workshop', location: 'Turing Hall' };
        setEventData(eventInfo);

        // 2. Perform checkin
        const res = await recordEventCheckin(user.id, eventId, token);

        if (res.success) {
          setStatus('success');
          setMessage(res.message);
          setPointsResult(res);
        } else if (res.reason === 'already_checked_in') {
          setStatus('already');
          setMessage(res.message);
        } else {
          setStatus('error');
          setMessage(res.message || 'Check-in validation failed.');
        }
      } catch (err) {
        console.error('[CheckinPage] Check-in error:', err);
        setStatus('error');
        setMessage('An error occurred while verifying your check-in. Please contact club organizers.');
      }
    }

    processCheckin();
  }, [token, user, authLoading]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200 p-8 shadow-xl text-center relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary-500 via-warning-400 to-primary-600" />

        {/* Status: Checking */}
        {status === 'checking' && (
          <div className="py-8 space-y-4">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-neutral-900">Validating Check-in Token...</h2>
            <p className="text-xs text-neutral-500">Checking event credentials and updating your points ledger.</p>
          </div>
        )}

        {/* Status: Unauthenticated */}
        {status === 'unauthenticated' && (
          <div className="py-4 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl border border-amber-200">
              🎟️
            </div>
            <div>
              <h2 className="text-xl font-black text-neutral-900">Member Sign-In Required</h2>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                {message}
              </p>
            </div>
            <Link
              to={`/login?redirect=/checkin?token=${encodeURIComponent(token || '')}`}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm shadow-md transition-all"
            >
              <span>Log In to Check In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Status: Success */}
        {status === 'success' && (
          <div className="py-2 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-sm animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Attendance Confirmed!</span>
              </div>
              <h2 className="text-2xl font-black text-neutral-900">
                +50 Points Awarded!
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                {eventData?.title || 'Campus Developer Workshop'}
              </p>
            </div>

            {/* Streak & Points Summary */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 flex items-center justify-around">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total Points</span>
                <span className="text-xl font-black text-primary-600">{pointsResult?.newTotal || 50} pts</span>
              </div>
              <div className="h-8 w-px bg-neutral-200" />
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Streak</span>
                <span className="text-xl font-black text-warning-500 flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 fill-warning-500" />
                  {pointsResult?.streak || 1}
                </span>
              </div>
            </div>

            {/* Unlocked Badges */}
            {pointsResult?.unlockedBadges && pointsResult.unlockedBadges.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left">
                <p className="text-xs font-bold text-amber-800 flex items-center gap-1 mb-1">
                  <span>🏆</span> New Badge Unlocked!
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-3xl">{pointsResult.unlockedBadges[0].icon_url}</span>
                  <div>
                    <p className="font-extrabold text-sm text-neutral-900">{pointsResult.unlockedBadges[0].name}</p>
                    <p className="text-[11px] text-neutral-500">{pointsResult.unlockedBadges[0].description}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link
                to="/leaderboard"
                className="flex-1 py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5 text-warning-500" />
                <span>Leaderboard</span>
              </Link>
              <Link
                to="/profile"
                className="flex-1 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1"
              >
                <span>View Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Status: Already Checked In */}
        {status === 'already' && (
          <div className="py-4 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200 text-2xl">
              🎟️
            </div>
            <div>
              <h2 className="text-xl font-black text-neutral-900">Already Checked In</h2>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                {message}
              </p>
            </div>
            <Link
              to="/leaderboard"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition-all"
            >
              <span>View Leaderboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Status: Error */}
        {status === 'error' && (
          <div className="py-4 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-neutral-900">Check-in Error</h2>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                {message}
              </p>
            </div>
            <Link
              to="/events"
              className="w-full inline-flex items-center justify-center py-3 px-4 rounded-xl bg-neutral-900 text-white font-bold text-xs transition-all"
            >
              Back to Workshops
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
export default CheckinPage;
