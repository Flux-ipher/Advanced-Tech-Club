// useResources hook for managing and downloading resources
import { useState, useEffect, useCallback } from 'react';
import { getResources, createResource, deleteResource, incrementDownloadCount } from '../api/resources.js';

const CACHE_KEY = 'atc_cache_resources';

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

export default useResources;
