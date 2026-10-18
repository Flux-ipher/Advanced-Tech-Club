// Notification Zustand Store
import { create } from 'zustand';
import { initialNotifications } from '../mockData.js';

export const useNotificationStore = create((set, get) => ({
  notifications: initialNotifications,
  unreadCount: initialNotifications.filter((n) => !n.read).length,
  isOpen: false,

  setNotifications: (notifications) => {
    const unread = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount: unread });
  },

  addNotification: (notification) => {
    const next = [notification, ...get().notifications];
    set({
      notifications: next,
      unreadCount: next.filter((n) => !n.read).length
    });
  },

  markAsRead: (id) => {
    const next = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    set({
      notifications: next,
      unreadCount: next.filter((n) => !n.read).length
    });
  },

  markAllAsRead: () => {
    const next = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: next, unreadCount: 0 });
  },

  setIsOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen }))
}));
