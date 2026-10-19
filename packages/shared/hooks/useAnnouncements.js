// useAnnouncements hook with Supabase Realtime subscription
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePinAnnouncement
} from '../api/announcements.js';

const CACHE_KEY = 'atc_cache_announcements';

function loadCachedAnnouncements() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCachedAnnouncements(data) {
  if (typeof window === 'undefined' || !Array.isArray(data)) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {}
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState(() => loadCachedAnnouncements());
  const [loading, setLoading] = useState(() => loadCachedAnnouncements().length === 0);
  const [error, setError] = useState(null);

  const fetchAnnouncements = useCallback(async () => {
    try {
      if (loadCachedAnnouncements().length === 0) {
        setLoading(true);
      }
      const data = await getAnnouncements();
      setAnnouncements(data);
      saveCachedAnnouncements(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();

    // Subscribe to Realtime Postgres changes
    const channel = supabase
      .channel('announcements-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAnnouncements((prev) => [payload.new, ...prev.filter((a) => a.id !== payload.new.id)]);
          } else if (payload.eventType === 'UPDATE') {
            setAnnouncements((prev) =>
              prev.map((a) => (a.id === payload.new.id ? payload.new : a))
            );
          } else if (payload.eventType === 'DELETE') {
            setAnnouncements((prev) =>
              prev.filter((a) => a.id !== payload.old?.id && a.id !== payload.new?.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchAnnouncements]);

  const addAnnouncement = async (payload) => {
    const created = await createAnnouncement(payload);
    setAnnouncements((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
    return created;
  };

  const removeAnnouncement = async (id) => {
    await deleteAnnouncement(id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const pinAnnouncement = async (id, currentPinned) => {
    const updated = await togglePinAnnouncement(id, currentPinned);
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, pinned: !currentPinned } : a))
    );
    return updated;
  };

  return {
    announcements,
    loading,
    error,
    refresh: fetchAnnouncements,
    addAnnouncement,
    removeAnnouncement,
    pinAnnouncement
  };
}

export default useAnnouncements;
