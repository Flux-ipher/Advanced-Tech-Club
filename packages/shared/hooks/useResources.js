import { useState, useEffect, useCallback } from 'react';
import {
  getResources,
  createResource,
  deleteResource,
  incrementDownloadCount,
  getVaultGalleryMemories,
  addVaultGalleryMemory,
  updateVaultGalleryMemory,
  deleteVaultGalleryMemory,
  toggleLikeVaultGalleryMemory
} from '../api/resources.js';

const CACHE_KEY = 'atc_cache_resources';
const LIKED_MEMORIES_KEY = 'atc_liked_memories';

function loadCachedResources() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCachedResources(data) {
  if (typeof window === 'undefined' || !Array.isArray(data)) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {}
}

export function useResources() {
  const [resources, setResources] = useState(() => loadCachedResources());
  const [loading, setLoading] = useState(() => loadCachedResources().length === 0);
  const [error, setError] = useState(null);

  const fetchResources = useCallback(async () => {
    try {
      if (loadCachedResources().length === 0) {
        setLoading(true);
      }
      const data = await getResources();
      setResources(data);
      saveCachedResources(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const addResource = async (payload) => {
    const created = await createResource(payload);
    setResources((prev) => [created, ...prev]);
    return created;
  };

  const removeResource = async (id) => {
    await deleteResource(id);
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  const downloadResource = async (resource) => {
    await incrementDownloadCount(resource.id);
    setResources((prev) =>
      prev.map((r) =>
        r.id === resource.id ? { ...r, download_count: (r.download_count || 0) + 1 } : r
      )
    );
    // trigger file open / simulated download
    if (typeof window !== 'undefined') {
      window.open(resource.file_url, '_blank');
    }
  };

  return {
    resources,
    loading,
    error,
    refresh: fetchResources,
    addResource,
    removeResource,
    downloadResource
  };
}

export function useVaultGallery() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(LIKED_MEMORIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getVaultGalleryMemories();
      setMemories(data || []);
    } catch (e) {
      console.warn('[useVaultGallery] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const addMemory = async (memory) => {
    const created = await addVaultGalleryMemory(memory);
    setMemories((prev) => [created, ...prev]);
    return created;
  };

  const editMemory = async (id, memory) => {
    const updated = await updateVaultGalleryMemory(id, memory);
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
    );
    return updated;
  };

  const removeMemory = async (id) => {
    await deleteVaultGalleryMemory(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleLike = async (id) => {
    const isLiked = likedIds.includes(id);
    const target = memories.find((m) => m.id === id);
    const currentLikes = target?.likes_count || 0;
    const nextLikes = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;

    // Optimistically update memory count
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, likes_count: nextLikes } : m))
    );

    // Optimistically update liked IDs set
    const updatedLiked = isLiked
      ? likedIds.filter((item) => item !== id)
      : [...likedIds, id];
    setLikedIds(updatedLiked);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LIKED_MEMORIES_KEY, JSON.stringify(updatedLiked));
      } catch (e) {}
    }

    await toggleLikeVaultGalleryMemory(id, isLiked, currentLikes);
  };

  return {
    memories,
    loading,
    likedIds,
    refresh: fetchMemories,
    addMemory,
    editMemory,
    removeMemory,
    toggleLike
  };
}

export default useResources;
