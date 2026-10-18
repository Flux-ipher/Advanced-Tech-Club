// Events API for ATC Platform
import { supabase, mockDb } from '../supabaseClient.js';

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_at', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
  return data || [];
}

export async function getEventById(id) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching event ${id}:`, error);
    throw error;
  }
  return data;
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
      // increment event count
      const evt = (mockDb.storage.events || []).find((e) => e.id === eventId);
      if (evt) evt.registrations_count = (evt.registrations_count || 0) + 1;
    }
    return { success: true };
  }

  const { data, error } = await supabase
    .from('event_registrations')
    .insert([{ event_id: eventId, user_id: userId, registered_at: new Date().toISOString() }]);

  if (error) {
    console.error('Error registering for event:', error);
    throw error;
  }
  return { success: true, data };
}

export async function unregisterForEvent(eventId, userId) {
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
}

export async function getEventRegistrations(eventId) {
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

  if (error) {
    console.error('Error fetching registrations:', error);
    throw error;
  }
  return (data || []).map((r) => ({
    ...r,
    full_name: r.profiles?.full_name || 'Member',
    email: r.profiles?.email || '',
    department: r.profiles?.department || '',
    student_id: r.profiles?.student_id || ''
  }));
}

export async function getUserRegistrations(userId) {
  if (supabase.isMock) {
    return (mockDb.storage.event_registrations || []).filter((r) => r.user_id === userId);
  }

  const { data, error } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user registrations:', error);
    throw error;
  }
  return data || [];
}
