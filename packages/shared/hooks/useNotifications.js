// useNotifications hook with store sync
import { useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { useAuthStore } from '../store/authStore.js';

export function useNotifications() {
  const currentUser = useAuthStore((s) => s.user);
  const {
    notifications,
    unreadCount,
    isOpen,
    setNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    setIsOpen,
    toggleOpen
  } = useNotificationStore();

  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await getNotifications(currentUser.id);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [currentUser, setNotifications]);

  useEffect(() => {
    loadNotifications();

    if (!currentUser) return;

    const channel = supabase
      .channel(`notifications-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications_log',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          addNotification(payload.new);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [loadNotifications, currentUser, addNotification]);

  const handleMarkAsRead = async (id) => {
    markAsRead(id);
    await markNotificationRead(id).catch(console.error);
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    markAllAsRead();
    await markAllNotificationsRead(currentUser.id).catch(console.error);
  };

  return {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    toggleOpen,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    refresh: loadNotifications
  };
}

export default useNotifications;
