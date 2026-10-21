import React from 'react';
import { PushPin, Trash, Clock, Tag, ShareNetwork } from '@phosphor-icons/react';
import { formatRelativeTime } from '@atc/shared/utils/formatters';
import { RoleBadge } from './RoleBadge';

export function AnnouncementCard({
  announcement,
  isAdmin = false,
  onPin,
  onDelete
}) {
  const {
    id,
    title,
    body,
    category = 'general',
    pinned,
    media_url,
    created_at,
    author_name,
    author_role,
    author_avatar
  } = announcement;

  const getCategoryBadge = () => {
    switch (category) {
      case 'hackathon':
        return 'bg-primary-50 text-primary-700 border-primary-200';
      case 'workshop':
        return 'bg-success-50 text-success-700 border-success-200';
      case 'opportunity':
        return 'bg-warning-50 text-warning-700 border-warning-200';
      case 'urgent':
        return 'bg-danger-50 text-danger-700 border-danger-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title, text: body, url: window.location.href });
    } else {
      navigator.clipboard.writeText(`${title}\n\n${body}`);
      alert('Announcement copied to clipboard!');
    }
  };

  return (
    <article
      className={`voodoo-card overflow-hidden transition-all duration-200 ${
        pinned
          ? 'border-primary-300 ring-1 ring-primary-200 bg-gradient-to-b from-primary-50/20 to-white'
          : 'hover:border-neutral-300'
      }`}
    >
      {/* Top Banner if pinned */}
      {pinned && (
        <div className="bg-primary-500 text-white px-5 py-1.5 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5 tracking-wide uppercase">
            <PushPin size={14} weight="fill" />
            Pinned Announcement
          </span>
          <span className="text-[11px] opacity-90 font-normal">Priority broadcast</span>
        </div>
      )}

      <div className="p-6">
        {/* Author Header & Meta */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <img
              src={
                author_avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
              }
              alt={author_name || 'Admin'}
              className="w-10 h-10 rounded-full object-cover border border-neutral-200"
            />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-neutral-900">{author_name || 'ATC Lead'}</h4>
                <RoleBadge role={author_role === 'Admin' || author_role === 'President' || author_role === 'super_admin' ? 'admin' : 'member'} size="xs" />
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                <Clock size={14} weight="regular" />
                <span>{formatRelativeTime(created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${getCategoryBadge()}`}
            >
              {category}
            </span>

            {/* Admin Action Controls */}
            {isAdmin && (
              <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
                {onPin && (
                  <button
                    onClick={() => onPin(id, pinned)}
                    title={pinned ? 'Unpin' : 'Pin to top'}
                    className={`p-1.5 rounded hover:bg-white text-neutral-600 transition-colors ${
                      pinned ? 'text-primary-600 font-bold' : ''
                    }`}
                  >
                    <PushPin size={14} weight={pinned ? 'fill' : 'regular'} className={pinned ? 'text-primary-600' : ''} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(id)}
                    title="Delete announcement"
                    className="p-1.5 rounded hover:bg-danger-50 text-neutral-500 hover:text-danger-600 transition-colors"
                  >
                    <Trash size={14} weight="regular" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-neutral-900 mb-2.5 leading-snug tracking-tight">
          {title}
        </h3>
        <p className="text-neutral-600 text-sm leading-relaxed whitespace-pre-line mb-4">
          {body}
        </p>

        {/* Optional Media Preview */}
        {media_url && (
          <div className="mt-4 mb-4 rounded-xl overflow-hidden border border-neutral-200 max-h-80 bg-neutral-100">
            <img
              src={media_url}
              alt={title}
              className="w-full h-full object-cover max-h-80 hover:scale-101 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Tag size={12} weight="regular" className="text-neutral-400" />
            Category: <strong className="text-neutral-700 capitalize">{category}</strong>
          </span>

          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <ShareNetwork size={14} weight="regular" />
            Share
          </button>
        </div>
      </div>
    </article>
  );
}

export default AnnouncementCard;
