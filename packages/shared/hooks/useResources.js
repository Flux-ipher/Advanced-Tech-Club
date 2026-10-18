// useResources hook for managing and downloading resources
import { useState, useEffect, useCallback } from 'react';
import { getResources, createResource, deleteResource, incrementDownloadCount } from '../api/resources.js';

export function useResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getResources();
      setResources(data);
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
