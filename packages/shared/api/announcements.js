import { supabase } from '../supabaseClient.js';
import { initialAnnouncements } from '../mockData.js';

export async function getAnnouncements() {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return initialAnnouncements;
    }

    return data.map((item) => ({
      ...item,
      author_name: item.author_name || 'Club Admin',
      author_role: item.author_role || (item.pinned ? 'Admin' : 'Club Lead'),
      author_avatar: item.author_avatar || null
    }));
  } catch (err) {
    console.warn('Falling back to initial announcements:', err);
    return initialAnnouncements;
  }
}

export async function createAnnouncement({ title, body, media_url, category = 'general', pinned = false, author_id, author_name, author_role, author_avatar }) {
  const safeAuthorId = author_id || 'usr-1';
  const fullPayload = {
    title,
    body,
    media_url: media_url || null,
    category,
    pinned: Boolean(pinned),
    author_id: safeAuthorId,
    author_name: author_name || 'Admin',
    author_role: author_role || 'Club Admin',
    author_avatar: author_avatar || null,
    created_at: new Date().toISOString()
  };

  // 1. First attempt: Insert with author metadata columns
  let { data, error } = await supabase
    .from('announcements')
    .insert([fullPayload])
    .select()
    .single();

  // 2. If table schema does not yet have author_avatar / author_name / author_role columns in Supabase schema cache
  if (error && (
    error.message?.includes('author_avatar') ||
    error.message?.includes('author_name') ||
    error.message?.includes('author_role') ||
    error.message?.includes('column') ||
    error.message?.includes('schema cache') ||
    error.code === 'PGRST204' ||
    error.code === '42703'
  )) {
    console.warn('[ATC Announcements] Retrying insert with core schema columns (omitting author_* metadata):', error.message);
    const corePayload = {
      title,
      body,
      media_url: media_url || null,
      category,
      pinned: Boolean(pinned),
      author_id: safeAuthorId,
      created_at: new Date().toISOString()
    };

    const retryRes = await supabase
      .from('announcements')
      .insert([corePayload])
      .select()
      .single();

    data = retryRes.data;
    error = retryRes.error;
  }

  // 3. If foreign key constraint failed on author_id, retry with seed admin usr-1
  if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
    console.warn('[ATC Announcements] Author ID foreign key mismatch, retrying with seed admin author_id:', error.message);
    const fallbackPayload = {
      title,
      body,
      media_url: media_url || null,
      category,
      pinned: Boolean(pinned),
      author_id: 'usr-1',
      created_at: new Date().toISOString()
    };

    const fallbackRes = await supabase
      .from('announcements')
      .insert([fallbackPayload])
      .select()
      .single();

    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }

  return {
    ...data,
    author_name: data?.author_name || author_name || 'Admin',
    author_role: data?.author_role || author_role || 'Club Admin',
    author_avatar: data?.author_avatar || author_avatar || null
  };
}

export async function updateAnnouncement(id, updates) {
  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
  return data;
}

export async function togglePinAnnouncement(id, currentPinned) {
  return updateAnnouncement(id, { pinned: !currentPinned });
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
  return true;
}
