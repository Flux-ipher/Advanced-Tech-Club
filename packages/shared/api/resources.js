import { supabase, mockDb } from '../supabaseClient.js';
import { initialResources } from '../mockData.js';

export function normalizeResource(res) {
  if (!res) return res;
  const url = res.file_url || res.url || '#';
  return {
    ...res,
    file_url: url,
    url: res.url || url,
    tags: Array.isArray(res.tags) ? res.tags : (typeof res.tags === 'string' ? [res.tags] : []),
    category: res.category || 'Documentation',
    file_size: res.file_size || 'Web Resource',
    download_count: Number(res.download_count) || 0
  };
}

export async function getResources() {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return initialResources.map(normalizeResource);
    }
    return data.map(normalizeResource);
  } catch (err) {
    console.warn('Falling back to initial resources:', err);
    return initialResources.map(normalizeResource);
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

export async function getResourceById(id) {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return normalizeResource(data);
    }
  } catch (err) {
    console.warn('[ATC Resources] getResourceById live fetch note:', err);
  }

  // Fallback to initial resources lookup
  const found = initialResources.find((r) => r.id === id);
  return found ? normalizeResource(found) : null;
}

export const initialGalleryMemories = [
  {
    id: 'mem-1',
    title: '1st Prize — Smart India Hackathon (SIH) 2025',
    description: 'Team ByteForce from Advanced Tech Club designed and built a realtime automated disaster coordination platform using autonomous drones and edge AI, securing 1st place nationwide.',
    image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    category: 'hackathon',
    tags: ['SIH 2025', 'AI/ML', 'Edge AI', 'National Champion'],
    achievers: ['Ritesh Mishra', 'Aryan Sharma', 'Sneha Patel', 'Devansh Verma'],
    event_date: '2025-12-15',
    award_title: 'National Champions · Grand Prize',
    author_name: 'ATC Core Team',
    likes_count: 48
  },
  {
    id: 'mem-2',
    title: 'The Cyber Heist (CTF Offensive Security Challenge)',
    description: 'Over 120 students competed in Room 416 during our late-night Capture The Flag challenge. Fireteams reversed binaries, intercepted packet streams, and decoded encrypted flags.',
    image_url: 'https://cjmviumwfzxkxtorzyvk.supabase.co/storage/v1/object/public/event-images/1772085185188-jggj8y620bh.jpg',
    category: 'event',
    tags: ['Cybersecurity', 'CTF', 'Offensive Security', 'Reverse Engineering'],
    achievers: ['Team KernelPanic', 'Team RedShell', 'Team NullBytes'],
    event_date: '2026-03-24',
    award_title: 'Best Red Team Fireteam',
    author_name: 'Ritesh Mishra (Admin)',
    likes_count: 64
  },
  {
    id: 'mem-3',
    title: 'Top Open Source Contributors — Spring 2026',
    description: 'Honoring club members who merged 50+ production PRs into campus open source repositories, maintaining the ATC Mobile and Web codebase with zero regressions.',
    image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    category: 'contributor',
    tags: ['Open Source', 'Core Contributors', 'Pull Requests', 'Engineering'],
    achievers: ['Ritesh Mishra', 'Aman Gupta', 'Priya Singh'],
    event_date: '2026-04-10',
    award_title: 'Gold Committer Honors',
    author_name: 'ATC Lead Council',
    likes_count: 52
  },
  {
    id: 'mem-4',
    title: 'The "Jugaad-a-thon" (Useless Tech Showcase)',
    description: 'A hilarious 90-minute design sprint where students built delightfully pointless tech: from a keyboard that shocked you on typos to an AI that argued back with Shakespearean insults.',
    image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    category: 'hackathon',
    tags: ['Jugaad', 'Hardware', 'Creative Tech', 'Fun'],
    achievers: ['Team ChaosEngineers', 'Team Overkill'],
    event_date: '2026-04-17',
    award_title: 'Most Creative Useless Tech',
    author_name: 'ATC Community',
    likes_count: 39
  }
];

export async function getVaultGalleryMemories() {
  try {
    const { data, error } = await supabase
      .from('vault_gallery')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((item) => ({
        ...item,
        tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? [item.tags] : []),
        achievers: Array.isArray(item.achievers) ? item.achievers : (typeof item.achievers === 'string' ? [item.achievers] : [])
      }));
    }
  } catch (err) {
    console.warn('[ATC Gallery] Live memories fetch note:', err);
  }

  let deletedIds = [];
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('atc_deleted_gallery_memories');
      if (raw) deletedIds = JSON.parse(raw);
    }
  } catch (e) {}

  try {
    const { data, error } = await supabase
      .from('vault_gallery')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data
        .filter((item) => !deletedIds.includes(item.id))
        .map((item) => ({
          ...item,
          tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? [item.tags] : []),
          achievers: Array.isArray(item.achievers) ? item.achievers : (typeof item.achievers === 'string' ? [item.achievers] : [])
        }));
    }
  } catch (err) {
    console.warn('[ATC Gallery] Live memories fetch note:', err);
  }

  return initialGalleryMemories.filter((item) => !deletedIds.includes(item.id));
}

export async function addVaultGalleryMemory(memory) {
  const payload = {
    title: memory.title,
    description: memory.description || '',
    image_url: memory.image_url,
    category: memory.category || 'event',
    tags: Array.isArray(memory.tags) ? memory.tags : [],
    achievers: Array.isArray(memory.achievers) ? memory.achievers : [],
    award_title: memory.award_title || '',
    event_date: memory.event_date || new Date().toISOString().split('T')[0],
    author_name: memory.author_name || 'Club Admin',
    author_id: memory.author_id || null,
    likes_count: 1
  };

  const { data, error } = await supabase
    .from('vault_gallery')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[ATC Gallery] Error adding memory:', error);
    throw error;
  }
  return data;
}

export async function updateVaultGalleryMemory(id, memory) {
  const payload = {
    title: memory.title,
    description: memory.description || '',
    image_url: memory.image_url,
    category: memory.category || 'event',
    tags: Array.isArray(memory.tags) ? memory.tags : [],
    achievers: Array.isArray(memory.achievers) ? memory.achievers : [],
    award_title: memory.award_title || '',
    event_date: memory.event_date || new Date().toISOString().split('T')[0]
  };

  try {
    const { data, error } = await supabase
      .from('vault_gallery')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('[ATC Gallery] Live memory update note:', err);
  }

  return { id, ...payload };
}

export async function deleteVaultGalleryMemory(id) {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('atc_deleted_gallery_memories');
      const list = raw ? JSON.parse(raw) : [];
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem('atc_deleted_gallery_memories', JSON.stringify(list));
      }
    }
  } catch (e) {}

  try {
    const { error } = await supabase
      .from('vault_gallery')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('[ATC Gallery] Live memory delete warning:', error);
    }
  } catch (err) {
    console.warn('[ATC Gallery] Error deleting memory:', err);
  }

  return true;
}

export async function toggleLikeVaultGalleryMemory(id, isCurrentlyLiked, currentLikes = 0) {
  const newLikes = isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
  try {
    const { error } = await supabase
      .from('vault_gallery')
      .update({ likes_count: newLikes })
      .eq('id', id);

    if (error) {
      console.warn('[ATC Gallery] live like update note:', error);
    }
  } catch (err) {
    console.warn('[ATC Gallery] toggleLike error:', err);
  }
  return { success: true, newLikes, isLiked: !isCurrentlyLiked };
}
