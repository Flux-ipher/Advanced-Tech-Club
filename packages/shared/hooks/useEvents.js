// useEvents hook with Supabase Realtime subscription and registration helpers
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterForEvent,
  getUserRegistrations
} from '../api/events.js';
import { useAuthStore } from '../store/authStore.js';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentUser = useAuthStore((s) => s.user);

  const fetchEventsAndRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const [eventsData, regsData] = await Promise.all([
        getEvents(),
        currentUser ? getUserRegistrations(currentUser.id) : Promise.resolve([])
      ]);
      setEvents(eventsData);
      setUserRegistrations(regsData);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchEventsAndRegistrations();

    const channel = supabase
      .channel('events-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEvents((prev) => [...prev.filter((e) => e.id !== payload.new.id), payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setEvents((prev) => prev.map((e) => (e.id === payload.new.id ? payload.new : e)));
        } else if (payload.eventType === 'DELETE') {
          setEvents((prev) => prev.filter((e) => e.id !== payload.old?.id && e.id !== payload.new?.id));
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchEventsAndRegistrations]);

  const isUserRegistered = useCallback(
    (eventId) => {
      return userRegistrations.some((r) => r.event_id === eventId);
    },
    [userRegistrations]
  );

  const handleRegister = async (eventId) => {
    if (!currentUser) throw new Error('Must be logged in to register');
    await registerForEvent(eventId, currentUser.id);
    setUserRegistrations((prev) => [
      ...prev,
      { event_id: eventId, user_id: currentUser.id, registered_at: new Date().toISOString() }
    ]);
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, registrations_count: (e.registrations_count || 0) + 1 } : e
      )
    );
  };

  const handleUnregister = async (eventId) => {
    if (!currentUser) return;
    await unregisterForEvent(eventId, currentUser.id);
    setUserRegistrations((prev) => prev.filter((r) => r.event_id !== eventId));
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId && e.registrations_count > 0
          ? { ...e, registrations_count: e.registrations_count - 1 }
          : e
      )
    );
  };

  const addEvent = async (payload) => {
    const created = await createEvent(payload);
    setEvents((prev) => [...prev, created]);
    return created;
  };

  const removeEvent = async (id) => {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return {
    events,
    userRegistrations,
    loading,
    error,
    refresh: fetchEventsAndRegistrations,
    isUserRegistered,
    register: handleRegister,
    unregister: handleUnregister,
    addEvent,
    removeEvent
  };
}

export default useEvents;
