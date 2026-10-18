// Profiles API for ATC Platform
import { supabase, mockDb } from '../supabaseClient.js';

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`Error fetching profile ${userId}:`, error);
    throw error;
  }
  return data;
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching all profiles:', error);
    throw error;
  }
  return data || [];
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
  return data;
}

export async function setRole(userId, newRole) {
  if (!['member', 'admin', 'super_admin'].includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}`);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error(`Error setting role for user ${userId}:`, error);
    throw error;
  }
  return data;
}

export async function updatePushToken(userId, token) {
  return updateProfile(userId, { push_token: token });
}

export async function verifyMember(userId, verifierId) {
  return updateProfile(userId, {
    is_verified: true,
    verification_status: 'verified',
    verified_at: new Date().toISOString(),
    verified_by: verifierId || null
  });
}

export async function rejectMember(userId) {
  return updateProfile(userId, {
    is_verified: false,
    verification_status: 'rejected'
  });
}

export async function uploadAvatar(userId, file) {
  const fileExt = file.name ? file.name.split('.').pop() : 'png';
  const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const avatarUrl = data.publicUrl;

  await updateProfile(userId, { avatar_url: avatarUrl });
  return avatarUrl;
}
