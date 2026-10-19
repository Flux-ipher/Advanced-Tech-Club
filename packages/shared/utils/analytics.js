// Shared Analytics Helper for ATC Platform
// Bridges web (firebase/analytics) and mobile (@react-native-firebase/analytics)
// Logs custom events defined in the Firebase Auth + Supabase Integration Plan

let logAnalyticsEvent = async (eventName, params = {}) => {
  if (typeof window !== 'undefined') {
    try {
      const { getAnalytics, logEvent } = await import('firebase/analytics');
      const { app, isFirebaseConfigured } = await import('../firebaseClient.js');
      if (isFirebaseConfigured && app) {
        const analytics = getAnalytics(app);
        logEvent(analytics, eventName, params);
        return;
      }
    } catch (e) {
      // Analytics may not be supported in some environments (e.g. SSR, test)
    }
  }

  // Graceful fallback: console telemetry in development
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    // console.debug(`[Analytics: ${eventName}]`, params);
  }
};

export const setAnalyticsImpl = (fn) => {
  logAnalyticsEvent = fn;
};

export const Analytics = {
  screenView: (screenName) =>
    logAnalyticsEvent('screen_view', { screen_name: screenName }),
  announcementViewed: (id) =>
    logAnalyticsEvent('announcement_viewed', { announcement_id: id }),
  eventViewed: (id) =>
    logAnalyticsEvent('event_viewed', { event_id: id }),
  eventRegistered: (id) =>
    logAnalyticsEvent('event_registered', { event_id: id }),
  eventUnregistered: (id) =>
    logAnalyticsEvent('event_unregistered', { event_id: id }),
  resourceDownloaded: (id, category) =>
    logAnalyticsEvent('resource_downloaded', { resource_id: id, category }),
  adminPostedAnnouncement: () =>
    logAnalyticsEvent('admin_posted_announcement'),
  adminCreatedEvent: () =>
    logAnalyticsEvent('admin_created_event'),
  notificationOpened: (type) =>
    logAnalyticsEvent('notification_opened', { type }),
};

export default Analytics;
