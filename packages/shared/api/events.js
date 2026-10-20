import { supabase, mockDb } from '../supabaseClient.js';
import { initialEvents } from '../mockData.js';
import { idempotency } from '../utils/idempotency.js';
import { checkTokenBucket } from '../utils/rateLimiter.js';

export function normalizeEvent(evt) {
  if (!evt) return evt;
  const startAt = evt.start_at || evt.date || new Date().toISOString();
  const endAt = evt.end_at || startAt;
  const isPast = new Date(endAt).getTime() < Date.now();
  const isCompleted = evt.is_completed === true || (evt.is_completed !== false && isPast);
  const status = isCompleted ? 'completed' : 'upcoming';
  const banner = evt.banner_url || evt.image || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80';
  return {
    ...evt,
    start_at: startAt,
    date: evt.date || startAt,
    end_at: endAt,
    is_completed: isCompleted,
    status,
    is_past: isPast,
    banner_url: banner,
    image: evt.image || banner,
    tags: Array.isArray(evt.tags) ? evt.tags : (typeof evt.tags === 'string' ? [evt.tags] : []),
    registration_link: evt.registration_link || '',
    feedback_link: evt.feedback_link || '',
    capacity: Number(evt.capacity) || 100,
    registrations_count: Number(evt.registrations_count) || 0
  };
}

export async function getEvents() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return initialEvents.map(normalizeEvent);
    }
    return data.map(normalizeEvent);
  } catch (err) {
    console.warn('Falling back to initial events:', err);
    return initialEvents.map(normalizeEvent);
  }
}

export async function getEventById(id) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching event ${id}:`, error);
    const fallback = initialEvents.find((e) => e.id === id);
    if (fallback) return normalizeEvent(fallback);
    throw error;
  }
  return normalizeEvent(data);
}

export async function createEvent({
  title,
  description,
  banner_url,
  start_at,
  end_at,
  location,
  capacity = 100,
  category = 'technical',
  author_id,
  author_name
}) {
  const payload = {
    title,
    description,
    banner_url: banner_url || null,
    start_at,
    end_at: end_at || start_at,
    location,
    capacity: Number(capacity) || 100,
    category,
    author_id,
    author_name: author_name || 'Club Lead',
    registrations_count: 0,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('events')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    throw error;
  }
  return data;
}

export async function updateEvent(id, updates) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating event:', error);
    throw error;
  }
  return data;
}

export async function toggleEventCompletion(id, isCompleted) {
  return updateEvent(id, { is_completed: Boolean(isCompleted), updated_at: new Date().toISOString() });
}

export async function deleteEvent(id) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
  return true;
}

export async function registerForEvent(eventId, userId) {
  if (!eventId || !userId) return { success: false, reason: 'missing_params' };

  // 1. Token Bucket Rate Limiting (Prevents rapid RSVP spam)
  const bucketCheck = checkTokenBucket('RSVP', userId);
  if (!bucketCheck.allowed) {
    return {
      success: false,
      reason: 'rate_limited',
      retryAfterSec: bucketCheck.retryAfterSec,
      message: bucketCheck.message
    };
  }

  // 2. Idempotency Key Execution
  const key = idempotency.generateKey('rsvp', userId, eventId);
  return idempotency.execute(key, async () => {
    if (supabase.isMock) {
      const exists = (mockDb.storage.event_registrations || []).some(
        (r) => r.event_id === eventId && r.user_id === userId
      );
      if (!exists) {
        mockDb.storage.event_registrations.push({
          event_id: eventId,
          user_id: userId,
          registered_at: new Date().toISOString(),
          status: 'confirmed'
        });
        const evt = (mockDb.storage.events || []).find((e) => e.id === eventId);
        if (evt) evt.registrations_count = (evt.registrations_count || 0) + 1;
      }
      return { success: true, idempotent: exists };
    }

    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .upsert(
          [{ event_id: eventId, user_id: userId, status: 'confirmed', registered_at: new Date().toISOString() }],
          { onConflict: 'event_id,user_id' }
        )
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error registering for event:', error);
        throw error;
      }
      return { success: true, data };
    } catch (err) {
      // If duplicate constraint, return idempotent success
      if (err?.code === '23505' || String(err?.message).includes('unique')) {
        return { success: true, idempotent: true, alreadyRegistered: true };
      }
      throw err;
    }
  });
}

export async function unregisterForEvent(eventId, userId) {
  if (!eventId || !userId) return { success: false };

  // Token Bucket Rate Limiting
  const bucketCheck = checkTokenBucket('RSVP', userId);
  if (!bucketCheck.allowed) {
    return {
      success: false,
      reason: 'rate_limited',
      retryAfterSec: bucketCheck.retryAfterSec,
      message: bucketCheck.message
    };
  }

  const key = idempotency.generateKey('unrsvp', userId, eventId);
  return idempotency.execute(key, async () => {
    if (supabase.isMock) {
      mockDb.storage.event_registrations = (mockDb.storage.event_registrations || []).filter(
        (r) => !(r.event_id === eventId && r.user_id === userId)
      );
      const evt = (mockDb.storage.events || []).find((e) => e.id === eventId);
      if (evt && evt.registrations_count > 0) evt.registrations_count -= 1;
      return { success: true };
    }

    const { error } = await supabase
      .from('event_registrations')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error unregistering from event:', error);
      throw error;
    }
    return { success: true };
  });
}

export async function getEventRegistrations(eventId) {
  try {
    if (supabase.isMock) {
      const regs = (mockDb.storage.event_registrations || []).filter((r) => r.event_id === eventId);
      const enriched = regs.map((r) => {
        const user = (mockDb.storage.profiles || []).find((p) => p.id === r.user_id) || {};
        return {
          ...r,
          full_name: user.full_name || 'Member',
          email: user.email || 'student@techclub.edu',
          department: user.department || 'Engineering',
          student_id: user.student_id || 'ID-NA'
        };
      });
      return enriched;
    }

    const { data, error } = await supabase
      .from('event_registrations')
      .select('*, profiles(full_name, email, department, student_id)')
      .eq('event_id', eventId);

    if (error || !data || data.length === 0) {
      return (initialRegistrations || []).filter((r) => r.event_id === eventId);
    }

    return (data || []).map((r) => ({
      ...r,
      full_name: r.profiles?.full_name || 'Member',
      email: r.profiles?.email || '',
      department: r.profiles?.department || '',
      student_id: r.profiles?.student_id || ''
    }));
  } catch (err) {
    return (initialRegistrations || []).filter((r) => r.event_id === eventId);
  }
}

export async function getUserRegistrations(userId) {
  try {
    if (supabase.isMock) {
      return (mockDb.storage.event_registrations || []).filter((r) => r.user_id === userId);
    }

    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      return (initialRegistrations || []).filter((r) => r.user_id === userId);
    }
    return data;
  } catch (err) {
    return (initialRegistrations || []).filter((r) => r.user_id === userId);
  }
}
