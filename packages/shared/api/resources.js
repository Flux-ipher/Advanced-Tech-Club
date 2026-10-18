import { supabase, mockDb } from '../supabaseClient.js';
import { initialResources } from '../mockData.js';

export async function getResources() {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return initialResources;
    }
    return data;
  } catch (err) {
    console.warn('Falling back to initial resources:', err);
    return initialResources;
  }
}

export async function createResource({
  title,
  description,
  file_url,
  file_size,
  category = 'Slides',
  author_id,
  author_name
}) {
  const payload = {
    title,
    description: description || '',
    file_url,
    file_size: file_size || '1.0 MB',
    category,
    author_id,
    author_name: author_name || 'Admin',
    download_count: 0,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('resources')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating resource:', error);
    throw error;
  }
  return data;
}

export async function incrementDownloadCount(id) {
  if (supabase.isMock) {
    const res = (mockDb.storage.resources || []).find((r) => r.id === id);
    if (res) res.download_count = (res.download_count || 0) + 1;
    return true;
  }

  const { data, error } = await supabase.rpc('increment_resource_download', { resource_id: id });
  if (error) {
    // Fallback direct update
    const { data: current } = await supabase.from('resources').select('download_count').eq('id', id).single();
    if (current) {
      await supabase.from('resources').update({ download_count: (current.download_count || 0) + 1 }).eq('id', id);
    }
  }
  return true;
}

export async function deleteResource(id) {
  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting resource:', error);
    throw error;
  }
  return true;
}
