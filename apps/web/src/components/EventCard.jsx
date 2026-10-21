import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, MapPin, Users, CheckCircle2, ArrowRight, Trash2 } from 'lucide-react';
import { formatDateTime, formatDate } from '@atc/shared/utils/formatters';
import { isPortalSubdomain } from '@atc/shared/utils/domains';

export function EventCard({
  event,
  isRegistered = false,
  onRegister,
  onUnregister,
  isAdmin = false,
  onDelete
}) {
  const {
    id,
    title,
    description,
    banner_url,
    start_at,
    end_at,
    location,
    capacity = 100,
    category = 'technical',
    registrations_count = 0
  } = event;

  const spotsLeft = Math.max(0, capacity - registrations_count);
  const fillPercentage = Math.min(100, Math.round((registrations_count / capacity) * 100));
  const isPast = new Date(end_at || start_at).getTime() < Date.now();
  const isCompleted = event.is_completed === true || isPast;

  const locationHook = useLocation();
  const eventPath = isPortalSubdomain()
    ? `/events/${id}`
    : (locationHook.pathname.startsWith('/portal') ? `/portal/events/${id}` : `/events/${id}`);

  return (
    <div className="voodoo-card-hover flex flex-col h-full overflow-hidden group">
      {/* Banner Image */}
      <div className="relative h-48 w-full bg-neutral-100 overflow-hidden">
        <img
          src={
            banner_url ||
            'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80'
          }
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Category & Status Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-white/95 text-neutral-900 shadow-sm backdrop-blur-sm">
            {category}
          </span>
          {isCompleted && (
            <span className="px-2.5 py-1 rounded-md text-xs font-bold tracking-wide bg-neutral-900/90 text-white shadow-sm backdrop-blur-sm flex items-center gap-1 border border-white/20">
              🏁 Concluded
            </span>
          )}
        </div>

        {/* Registered status indicator overlay */}
        {isRegistered && (
          <div className="absolute top-3 right-3 bg-success-500 text-white px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Registered
          </div>
        )}

        {/* Date badge on image */}
        <div className="absolute bottom-3 left-3 text-white">
          <p className="text-xs font-semibold text-white/80">{isCompleted ? 'Concluded On' : 'Scheduled Date'}</p>
          <p className="text-sm font-bold">{formatDateTime(start_at)}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <Link to={eventPath} className="group-hover:text-primary-600 transition-colors">
            <h3 className="text-lg font-bold text-neutral-900 mb-2 line-clamp-2 leading-snug">
              {title}
            </h3>
          </Link>
          <p className="text-neutral-500 text-sm line-clamp-2 mb-4 leading-relaxed">
            {description}
          </p>

          {/* Details list */}
          <div className="space-y-2 mb-4 text-xs text-neutral-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>
                <strong className="text-neutral-900">{registrations_count}</strong> registered
                <span className="text-neutral-400"> / {capacity} capacity ({spotsLeft} spots left)</span>
              </span>
            </div>
          </div>

          {/* Capacity Progress Bar */}
          <div className="w-full bg-neutral-100 rounded-full h-1.5 mb-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                fillPercentage > 85 ? 'bg-danger-500' : fillPercentage > 60 ? 'bg-warning-500' : 'bg-primary-500'
              }`}
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
          <Link
            to={eventPath}
            className="text-xs font-semibold text-neutral-600 hover:text-primary-600 flex items-center gap-1 transition-colors"
          >
            Details <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <div className="flex items-center gap-2">
            {isAdmin && onDelete && (
              <button
                onClick={() => onDelete(id)}
                title="Delete event"
                className="p-2 text-neutral-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {isCompleted ? (
              <span className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200">
                🏁 Concluded
              </span>
            ) : isRegistered ? (
              <button
                onClick={() => onUnregister(id)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-danger-50 text-danger-700 hover:bg-danger-100 border border-danger-200 transition-colors"
              >
                Cancel RSVP
              </button>
            ) : (
              <button
                onClick={() => onRegister(id)}
                disabled={spotsLeft <= 0}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                {spotsLeft <= 0 ? 'Waitlist Full' : 'Quick RSVP'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventCard;
