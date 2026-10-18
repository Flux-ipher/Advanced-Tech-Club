import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useEvents } from '@atc/shared/hooks/useEvents';
import { getEventById, getEventRegistrations } from '@atc/shared/api/events';
import { formatDateTime, formatDate } from '@atc/shared/utils/formatters';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  ArrowLeft,
  Share2,
  Download,
  AlertCircle,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { isUserRegistered, register, unregister } = useEvents();

  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [eventData, regsData] = await Promise.all([
          getEventById(id),
          getEventRegistrations(id)
        ]);
        setEvent(eventData);
        setRegistrations(regsData);
      } catch (err) {
        setError(err.message || 'Failed to load event details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-neutral-500">Loading event information...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-neutral-800">Event Not Found</h2>
        <p className="text-sm text-neutral-500 mt-1 mb-6">
          The event you are looking for may have been removed or rescheduled.
        </p>
        <Link to="/events" className="btn-primary text-sm inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>
      </div>
    );
  }

  const registered = isUserRegistered(event.id);
  const capacity = event.capacity || 100;
  const count = event.registrations_count || registrations.length || 0;
  const spotsLeft = Math.max(0, capacity - count);
  const fillRate = Math.min(100, Math.round((count / capacity) * 100));

  const handleRegisterToggle = async () => {
    if (registered) {
      await unregister(event.id);
      setRegistrations((prev) => prev.filter((r) => r.user_id !== user?.id));
    } else {
      await register(event.id);
      setRegistrations((prev) => [
        ...prev,
        {
          event_id: event.id,
          user_id: user?.id,
          full_name: user?.full_name || 'Member',
          email: user?.email || '',
          department: user?.department || 'Engineering',
          registered_at: new Date().toISOString()
        }
      ]);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Full Name', 'Email', 'Department', 'Student ID', 'Registered At'];
    const rows = registrations.map((r) => [
      `"${r.full_name || ''}"`,
      `"${r.email || ''}"`,
      `"${r.department || ''}"`,
      `"${r.student_id || ''}"`,
      `"${formatDate(r.registered_at)}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}_Attendees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <Link
        to="/events"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to all events
      </Link>

      {/* Main card */}
      <div className="voodoo-card overflow-hidden mb-8">
        {/* Banner */}
        <div className="relative h-72 sm:h-96 w-full bg-neutral-900 overflow-hidden">
          <img
            src={
              event.banner_url ||
              'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80'
            }
            alt={event.title}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-white/95 text-neutral-900 shadow backdrop-blur-sm">
              {event.category}
            </span>
            {registered && (
              <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-success-500 text-white shadow">
                ✓ RSVP Confirmed
              </span>
            )}
          </div>

          {/* Bottom Title on banner */}
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-2 leading-tight">
              {event.title}
            </h1>
            <p className="text-sm text-neutral-200 flex items-center gap-2">
              <span>Organized by <strong className="text-white">{event.author_name || 'ATC Leads'}</strong></span>
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left 2 cols: Description & details */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-base font-bold text-neutral-900 uppercase tracking-wider mb-2">
                  About This Event
                </h3>
                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>

              {/* What to bring / Preparation */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-2">
                <p className="font-bold text-neutral-800">📌 Member Guidelines:</p>
                <ul className="list-disc list-inside space-y-1 text-neutral-600 pl-1">
                  <li>Please arrive 10 minutes prior to scheduled start time for badge check-in.</li>
                  <li>Bring your laptop, charger, and have your Git/GitHub environment configured.</li>
                  <li>Certificates of participation will be generated for all confirmed attendees.</li>
                </ul>
              </div>

              {/* Registered Attendees Roster (Visible for transparency) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-primary-500" />
                    Attendee Roster ({registrations.length})
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={handleExportCSV}
                      className="text-xs text-primary-600 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                  )}
                </div>

                <div className="border border-neutral-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-neutral-100">
                  {registrations.length === 0 ? (
                    <div className="p-6 text-center text-xs text-neutral-400">
                      Be the first to RSVP for this event!
                    </div>
                  ) : (
                    registrations.map((reg, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-neutral-50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-[11px]">
                            {reg.full_name?.charAt(0) || 'M'}
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900">{reg.full_name}</p>
                            <p className="text-[11px] text-neutral-400">{reg.department || 'Engineering'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          {formatDate(reg.registered_at)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right 1 col: Key Details Box & RSVP */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-5">
                <h4 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                  Event Logistics
                </h4>

                <div className="space-y-4 text-xs">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-neutral-900">Date & Time</p>
                      <p className="text-neutral-500 mt-0.5">{formatDateTime(event.start_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-neutral-900">Venue</p>
                      <p className="text-neutral-500 mt-0.5">{event.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                    <div className="w-full">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-semibold text-neutral-900">Capacity</p>
                        <span className="text-neutral-500">{count} / {capacity}</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${fillRate}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">{spotsLeft} spots available</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-200">
                  {registered ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-success-50 text-success-700 rounded-xl border border-success-200 text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success-600 shrink-0" />
                        <span>You are registered for this event.</span>
                      </div>
                      <button
                        onClick={handleRegisterToggle}
                        className="w-full py-2 text-xs font-semibold rounded-lg bg-white border border-danger-200 text-danger-600 hover:bg-danger-50 transition-colors"
                      >
                        Cancel My Registration
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleRegisterToggle}
                      disabled={spotsLeft <= 0}
                      className="w-full btn-primary py-2.5 text-sm shadow-md"
                    >
                      {spotsLeft <= 0 ? 'Event Full (Waitlist)' : 'Confirm 1-Tap RSVP'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventDetailPage;
