// Tasks API for ATC Platform - Role-Based Task Assignment & Deliverables
import { supabase } from '../supabaseClient.js';
import { adjustMemberPoints } from './gamification.js';

const LOCAL_TASKS_KEY = 'atc_local_assigned_tasks';

const INITIAL_ROLE_TASKS = [
  {
    id: 'task-media-001',
    title: 'Capture & Curate Workshop Highlight Photos',
    description: 'Document high-resolution photos and stage moments from the upcoming campus workshop. Edit and publish to the Campus Gallery with event tags.',
    assigned_to_role: 'media_head',
    assigned_to_user_id: null,
    assigned_to_user_name: 'Media Team',
    assigned_by: 'admin-lead',
    assigned_by_name: 'Club Admin (Ritesh Mishra)',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    status: 'pending',
    points_reward: 100,
    deliverable_url: '',
    deliverable_notes: '',
    admin_feedback: '',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'task-media-002',
    title: 'Create Teaser Graphics & Promotional Posts for Hackathon',
    description: 'Design dynamic 16:9 and 1:1 promo graphics for the upcoming hackathon. Post the launch announcement on the club platform feed with registration link.',
    assigned_to_role: 'media_head',
    assigned_to_user_id: null,
    assigned_to_user_name: 'Media Team',
    assigned_by: 'admin-lead',
    assigned_by_name: 'Club Admin (Ritesh Mishra)',
    due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'urgent',
    status: 'in_progress',
    points_reward: 150,
    deliverable_url: 'https://drive.google.com/drive/folders/atc-promo-hackathon',
    deliverable_notes: 'Draft banners uploaded to folder. Reviewing typography.',
    admin_feedback: '',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  }
];

function getStoredLocalTasks() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem(LOCAL_TASKS_KEY);
      if (cached) return JSON.parse(cached);
    }
  } catch (err) {
    console.warn('[ATC Tasks] getStoredLocalTasks notice:', err);
  }
  return INITIAL_ROLE_TASKS;
}

function saveStoredLocalTasks(tasks) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
    }
  } catch (err) {
    console.warn('[ATC Tasks] saveStoredLocalTasks notice:', err);
  }
}

/**
 * Fetch all assigned tasks, optionally filtering by target role or target user
 */
export async function fetchAssignedTasks(filter = {}) {
  try {
    const { data, error } = await supabase
      .from('assigned_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      saveStoredLocalTasks(data);
      return filterTasks(data, filter);
    }
  } catch (err) {
    console.warn('[ATC Tasks] fetchAssignedTasks live query notice:', err);
  }

  // Fallback to local stored tasks
  const localList = getStoredLocalTasks();
  return filterTasks(localList, filter);
}

function filterTasks(list, filter) {
  if (!filter || Object.keys(filter).length === 0) return list;
  return list.filter((t) => {
    if (filter.role && filter.role !== 'all' && t.assigned_to_role !== 'all' && t.assigned_to_role !== filter.role) {
      return false;
    }
    if (filter.userId && t.assigned_to_user_id && t.assigned_to_user_id !== filter.userId) {
      return false;
    }
    if (filter.status && filter.status !== 'all' && t.status !== filter.status) {
      return false;
    }
    return true;
  });
}

/**
 * Create a new task assigned to a role or specific member
 */
export async function createAssignedTask(taskPayload) {
  const newTask = {
    id: `task_${Date.now()}`,
    title: taskPayload.title,
    description: taskPayload.description || '',
    assigned_to_role: taskPayload.assigned_to_role || 'media_head',
    assigned_to_user_id: taskPayload.assigned_to_user_id || null,
    assigned_to_user_name: taskPayload.assigned_to_user_name || (taskPayload.assigned_to_role === 'media_head' ? 'Media Head' : 'Club Member'),
    assigned_by: taskPayload.assigned_by || 'admin-lead',
    assigned_by_name: taskPayload.assigned_by_name || 'Club Admin (Ritesh Mishra)',
    due_date: taskPayload.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    priority: taskPayload.priority || 'medium',
    status: 'pending',
    points_reward: parseInt(taskPayload.points_reward, 10) || 50,
    deliverable_url: '',
    deliverable_notes: '',
    admin_feedback: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('assigned_tasks')
      .insert(newTask)
      .select()
      .single();

    if (!error && data) {
      const current = getStoredLocalTasks();
      saveStoredLocalTasks([data, ...current]);
      return { success: true, data };
    }
  } catch (err) {
    console.warn('[ATC Tasks] createAssignedTask live insert notice:', err);
  }

  // Local fallback
  const current = getStoredLocalTasks();
  const updated = [newTask, ...current];
  saveStoredLocalTasks(updated);
  return { success: true, data: newTask };
}

/**
 * Update task status (e.g. mark in_progress or cancelled)
 */
export async function updateTaskStatus(taskId, status, notes = '') {
  const updates = {
    status,
    updated_at: new Date().toISOString()
  };
  if (notes) updates.deliverable_notes = notes;

  try {
    await supabase.from('assigned_tasks').update(updates).eq('id', taskId);
  } catch (err) {
    console.warn('[ATC Tasks] updateTaskStatus notice:', err);
  }

  const current = getStoredLocalTasks();
  const updated = current.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
  saveStoredLocalTasks(updated);
  return { success: true };
}

/**
 * Submit task deliverable link & notes (Media Head or Assignee)
 */
export async function submitTaskDeliverable(taskId, { deliverableUrl, deliverableNotes }) {
  const updates = {
    status: 'submitted',
    deliverable_url: deliverableUrl || '',
    deliverable_notes: deliverableNotes || '',
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('assigned_tasks').update(updates).eq('id', taskId);
  } catch (err) {
    console.warn('[ATC Tasks] submitTaskDeliverable notice:', err);
  }

  const current = getStoredLocalTasks();
  const updated = current.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
  saveStoredLocalTasks(updated);
  return { success: true };
}

/**
 * Review task deliverable (Super Admin / Admin) and award XP
 */
export async function reviewAssignedTask(
  adminId,
  taskId,
  { status, adminFeedback = '', pointsAwarded = 0, targetUserId = null, title = '' }
) {
  const points = parseInt(pointsAwarded, 10) || 0;
  const updates = {
    status,
    admin_feedback: adminFeedback,
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('assigned_tasks').update(updates).eq('id', taskId);

    if (status === 'completed' && points > 0 && targetUserId) {
      await adjustMemberPoints(
        adminId,
        targetUserId,
        points,
        `Role Task Completed: ${title || 'Assigned Deliverable'}`
      );
    }
  } catch (err) {
    console.warn('[ATC Tasks] reviewAssignedTask notice:', err);
  }

  const current = getStoredLocalTasks();
  const updated = current.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
  saveStoredLocalTasks(updated);
  return { success: true };
}

/**
 * Delete assigned task (Admin / Super Admin)
 */
export async function deleteAssignedTask(taskId) {
  try {
    await supabase.from('assigned_tasks').delete().eq('id', taskId);
  } catch (err) {
    console.warn('[ATC Tasks] deleteAssignedTask notice:', err);
  }

  const current = getStoredLocalTasks();
  const updated = current.filter((t) => t.id !== taskId);
  saveStoredLocalTasks(updated);
  return { success: true };
}
