import React, { useRef, useEffect } from 'react';
import { Bell, CheckCheck, Clock, ExternalLink, X } from 'lucide-react';
import { useNotifications } from '@atc/shared/hooks/useNotifications';
import { formatRelativeTime } from '@atc/shared/utils/formatters';
import { useNavigate } from 'react-router-dom';

export function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    toggleOpen,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    if (notif.link_url) {
      navigate(notif.link_url);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        id="notification-bell-btn"
        className="relative p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors focus:outline-none"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-primary-500 rounded-full ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-neutral-200 rounded-xl shadow-modal z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-neutral-900 text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-primary-100 text-primary-700 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-neutral-100">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-neutral-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-neutral-50 cursor-pointer transition-colors flex gap-3 text-left ${
                    !notif.read ? 'bg-primary-50/40' : ''
                  }`}
                >
                  <div className="mt-0.5">
                    {!notif.read ? (
                      <span className="w-2 h-2 rounded-full bg-primary-500 block ring-4 ring-primary-100"></span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-neutral-300 block"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${!notif.read ? 'text-neutral-900' : 'text-neutral-700'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">{notif.message}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-neutral-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(notif.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-100 text-center">
            <span className="text-[11px] text-neutral-500">
              Real-time sync enabled via Supabase
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
