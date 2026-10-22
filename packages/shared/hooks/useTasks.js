// useTasks hook for assigned tasks, deliverable tracking, and XP awards
import { useState, useEffect, useCallback } from 'react';
import {
  fetchAssignedTasks,
  createAssignedTask,
  updateTaskStatus,
  submitTaskDeliverable,
  reviewAssignedTask,
  deleteAssignedTask
} from '../api/tasks.js';

export function useTasks(filter = {}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAssignedTasks(filter);
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load assigned tasks');
    } finally {
      setLoading(false);
    }
  }, [filter?.role, filter?.userId, filter?.status]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = async (payload) => {
    const res = await createAssignedTask(payload);
    if (res.success && res.data) {
      setTasks((prev) => [res.data, ...prev]);
    }
    return res;
  };

  const setStatus = async (taskId, status, notes = '') => {
    await updateTaskStatus(taskId, status, notes);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status, deliverable_notes: notes || t.deliverable_notes } : t))
    );
  };

  const submitDeliverable = async (taskId, { deliverableUrl, deliverableNotes }) => {
    await submitTaskDeliverable(taskId, { deliverableUrl, deliverableNotes });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'submitted',
              deliverable_url: deliverableUrl,
              deliverable_notes: deliverableNotes
            }
          : t
      )
    );
  };

  const reviewTask = async (adminId, taskId, reviewData) => {
    await reviewAssignedTask(adminId, taskId, reviewData);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: reviewData.status,
              admin_feedback: reviewData.adminFeedback || t.admin_feedback
            }
          : t
      )
    );
  };

  const removeTask = async (taskId) => {
    await deleteAssignedTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  return {
    tasks,
    loading,
    error,
    refresh: loadTasks,
    createTask,
    setStatus,
    submitDeliverable,
    reviewTask,
    removeTask
  };
}

export default useTasks;
