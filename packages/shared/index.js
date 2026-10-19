// Main entry point for @atc/shared

export * from './theme.js';
export * from './supabaseClient.js';
export * from './mockData.js';

// API
export * from './api/announcements.js';
export * from './api/events.js';
export * from './api/resources.js';
export * from './api/profiles.js';
export * from './api/notifications.js';
export * from './api/analytics.js';

// Hooks
export * from './hooks/useAuth.js';
export * from './hooks/useAnnouncements.js';
export * from './hooks/useEvents.js';
export * from './hooks/useResources.js';
export * from './hooks/useNotifications.js';
export * from './hooks/useMembers.js';

// Stores
export * from './store/authStore.js';
export * from './store/notificationStore.js';

// Utils
export * from './utils/formatters.js';
export * from './utils/validators.js';
export * from './utils/analytics.js';
export * from './firebaseClient.js';
