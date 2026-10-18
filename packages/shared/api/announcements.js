// Announcements API for ATC Platform
import { supabase } from '../supabaseClient.js';

export async function getAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching announcements:', error);
    throw error;
  }
  return data || [];
}

export async function createAnnouncement({ title, body, media_url, category = 'general', pinned = false, author_id, author_name, author_role, author_avatar }) {
  const payload = {
    title,
    body,
    media_url: media_url || null,
    category,
    pinned: Boolean(pinned),
    author_id,
    author_name: author_name || 'Admin',
    author_role: author_role || 'Club Admin',
    author_avatar: author_avatar || null,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('announcements')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
  return data;
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
