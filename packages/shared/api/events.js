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
    registrations_count: Number(evt.registrations_count) || 0,
    author_name: evt.author_name || 'Club Admin',
    author_role: evt.author_role || 'Admin',
    points: Number(evt.points) || 50
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
  if (!id) return null;
  try {
    if (supabase.isMock) {
      const found = (mockDb.storage.events || []).find((e) => e.id === id || e.slug === id);
      if (found) return normalizeEvent(found);
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return normalizeEvent(data);
    }
  } catch (err) {
    console.warn(`[ATC Events] getEventById Supabase note:`, err);
  }

  // Resilient fallback to initialEvents by id or slug
  const fallback = initialEvents.find((e) => e.id === id || e.slug === id);
  if (fallback) return normalizeEvent(fallback);
  return null;
}

export async function createEvent({
  title,
  description,
  banner_url,
  image,
  start_at,
  end_at,
  date,
  time,
  location,
  capacity = 100,
  category = 'technical',
  author_id,
  author_name,
  author_role,
  tags = [],
  points = 50
}) {
  const banner = banner_url || image || null;
  const safeAuthorId = (author_id && !author_id.startsWith('user-')) ? author_id : 'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2';
  const startIso = start_at || (date ? new Date(date).toISOString() : new Date().toISOString());
  const endIso = end_at || startIso;

  // Normalize category to values supported by database constraints
  const categoryMap = {
    'tech_talk': 'speaker_session',
    'study_jam': 'workshop'
  };
  const normCategory = categoryMap[category] || category || 'technical';

  const fullPayload = {
    title,
    description: description || 'Hands-on campus engineering workshop led by ATC.',
    banner_url: banner,
    image: banner,
    start_at: startIso,
    end_at: endIso,
    date: startIso,
    location,
    capacity: Number(capacity) || 100,
    category: normCategory,
    author_id: safeAuthorId,
    author_name: author_name || 'Club Admin',
    author_role: author_role || 'Admin',
    points: Number(points) || 50,
    tags: Array.isArray(tags) ? tags : [],
    is_completed: false,
    registrations_count: 0,
    created_at: new Date().toISOString()
  };

  // Attempt 1: Insert full payload with author & extended columns
  let { data, error } = await supabase
    .from('events')
    .insert([fullPayload])
    .select()
    .single();

  // Attempt 2: If schema cache rejects columns (author_name, registrations_count, points, tags, date, image, etc.)
  if (error && (
    error.message?.includes('column') ||
    error.message?.includes('schema cache') ||
    error.message?.includes('does not exist') ||
    error.code === 'PGRST204' ||
    error.code === '42703'
  )) {
    console.warn('[ATC Events] Retrying insert with core schema columns (omitting un-migrated columns):', error.message);
    const corePayload = {
      title,
      description: description || 'Hands-on campus engineering workshop led by ATC.',
      banner_url: banner,
      start_at: startIso,
      end_at: endIso,
      location,
      capacity: Number(capacity) || 100,
      category: ['technical', 'workshop', 'hackathon', 'speaker_session', 'social'].includes(normCategory) ? normCategory : 'technical',
      author_id: safeAuthorId,
      created_at: new Date().toISOString()
    };

    const retryRes = await supabase
      .from('events')
      .insert([corePayload])
      .select()
      .single();

    data = retryRes.data;
    error = retryRes.error;
  }

  // Attempt 3: If foreign key check failed on author_id (code 23503), retry with verified seed admin author_id
  if (error && (error.code === '23503' || error.message?.includes('foreign key') || error.message?.includes('violates foreign key'))) {
    console.warn('[ATC Events] Foreign key error on author_id, retrying with seed admin author_id:', error.message);
    const fallbackAuthorIds = ['Zp2JThOUCAbl7aF1TT4DQHUH0Dk2', 'usr-1'];
    for (const fallbackId of fallbackAuthorIds) {
      if (fallbackId === safeAuthorId) continue;
      const fkPayload = {
        title,
        description: description || 'Hands-on campus engineering workshop led by ATC.',
        banner_url: banner,
        start_at: startIso,
        end_at: endIso,
        location,
        capacity: Number(capacity) || 100,
        category: ['technical', 'workshop', 'hackathon', 'speaker_session', 'social'].includes(normCategory) ? normCategory : 'technical',
        author_id: fallbackId,
        created_at: new Date().toISOString()
      };
      const fkRes = await supabase
        .from('events')
        .insert([fkPayload])
        .select()
        .single();
      if (!fkRes.error) {
        data = fkRes.data;
        error = null;
        break;
      }
    }
  }

  // Attempt 4: If mock mode or network offline fallback
  if (error) {
    console.error('Error creating event in Supabase:', error);
    if (supabase.isMock || error) {
      const mockEvent = normalizeEvent({
        id: `evt-${Date.now()}`,
        ...fullPayload,
        time: time || '10:00 AM - 1:00 PM'
      });
      if (mockDb?.storage?.events) {
        mockDb.storage.events.unshift(mockEvent);
      }
      return mockEvent;
    }
    throw error;
  }

  return normalizeEvent({
    ...fullPayload,
    ...data,
    time: time || '10:00 AM - 1:00 PM',
    author_name: data?.author_name || author_name || 'Club Admin',
    author_role: data?.author_role || author_role || 'Admin',
    points: data?.points || points || 50,
    tags: data?.tags || tags || []
  });
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
      return [];
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
