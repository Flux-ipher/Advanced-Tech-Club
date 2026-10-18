// Notifications API for ATC Platform
import { supabase, mockDb } from '../supabaseClient.js';

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
  return data || [];
}

export async function markNotificationRead(id) {
  const { data, error } = await supabase
    .from('notifications_log')
    .update({ read: true })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error marking notification read:', error);
    throw error;
  }
  return data;
}

export async function markAllNotificationsRead(userId) {
  if (supabase.isMock) {
    mockDb.storage.notifications_log = (mockDb.storage.notifications_log || []).map((n) =>
      n.user_id === userId ? { ...n, read: true } : n
    );
    return true;
  }

  const { error } = await supabase
    .from('notifications_log')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications read:', error);
    throw error;
  }
  return true;
}

export async function createNotification({ userId, title, message, type = 'system', linkUrl }) {
  const payload = {
    user_id: userId,
    title,
    message,
    type,
    read: false,
    link_url: linkUrl || null,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('notifications_log')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
  return data;
}
