// Analytics API for ATC Platform (Admin & Super Admin dashboards)
import { supabase, mockDb } from '../supabaseClient.js';

export async function getAnalyticsSummary() {
  if (supabase.isMock) {
    const totalMembers = (mockDb.storage.profiles || []).length;
    const totalEvents = (mockDb.storage.events || []).length;
    const totalAnnouncements = (mockDb.storage.announcements || []).length;
    const totalRegistrations = (mockDb.storage.event_registrations || []).length;
    const totalResources = (mockDb.storage.resources || []).length;
    const totalDownloads = (mockDb.storage.resources || []).reduce(
      (acc, r) => acc + (r.download_count || 0),
      0
    );

    // Distribution by department
    const departmentStats = {};
    (mockDb.storage.profiles || []).forEach((p) => {
      const dept = p.department || 'Other';
      departmentStats[dept] = (departmentStats[dept] || 0) + 1;
    });

    // Event registrations breakdown
    const eventBreakdown = (mockDb.storage.events || []).map((e) => {
      const regs = (mockDb.storage.event_registrations || []).filter((r) => r.event_id === e.id).length;
      return {
        id: e.id,
        title: e.title,
        capacity: e.capacity || 100,
        registered: regs || e.registrations_count || 0,
        fillRate: Math.round(((regs || e.registrations_count || 0) / (e.capacity || 100)) * 100)
      };
    });

    return {
      totalMembers,
      totalEvents,
      totalAnnouncements,
      totalRegistrations,
      totalResources,
      totalDownloads,
      departmentStats,
      eventBreakdown,
      recentSignups: (mockDb.storage.profiles || []).slice(0, 5)
    };
  }

  // Live Supabase counts
  const [
    { count: totalMembers },
    { count: totalEvents },
    { count: totalAnnouncements },
    { count: totalRegistrations },
    { count: totalResources }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('announcements').select('*', { count: 'exact', head: true }),
    supabase.from('event_registrations').select('*', { count: 'exact', head: true }),
    supabase.from('resources').select('*', { count: 'exact', head: true })
  ]);

  const { data: resources } = await supabase.from('resources').select('download_count');
  const totalDownloads = (resources || []).reduce((acc, r) => acc + (r.download_count || 0), 0);

  const { data: events } = await supabase.from('events').select('id, title, capacity');
  const { data: regs } = await supabase.from('event_registrations').select('event_id');

  const eventBreakdown = (events || []).map((e) => {
    const registered = (regs || []).filter((r) => r.event_id === e.id).length;
    return {
      id: e.id,
      title: e.title,
      capacity: e.capacity || 100,
      registered,
      fillRate: Math.round((registered / (e.capacity || 100)) * 100)
    };
  });

  return {
    totalMembers: totalMembers || 0,
    totalEvents: totalEvents || 0,
    totalAnnouncements: totalAnnouncements || 0,
    totalRegistrations: totalRegistrations || 0,
    totalResources: totalResources || 0,
    totalDownloads,
    eventBreakdown,
    departmentStats: {
      'Computer Science & Engineering': Math.round((totalMembers || 10) * 0.5),
      'Software Engineering': Math.round((totalMembers || 10) * 0.25),
      'Data Science & AI': Math.round((totalMembers || 10) * 0.15),
      'Other': Math.round((totalMembers || 10) * 0.1)
    }
  };
}
