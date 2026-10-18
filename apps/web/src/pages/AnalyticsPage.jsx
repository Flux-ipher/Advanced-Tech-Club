import React, { useState, useEffect } from 'react';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { getAnalyticsSummary } from '@atc/shared/api/analytics';
import { formatDate } from '@atc/shared/utils/formatters';
import {
  BarChart3,
  Users,
  Calendar,
  FolderGit2,
  Sparkles,
  TrendingUp,
  Award,
  Download,
  CheckCircle2
} from 'lucide-react';

export function AnalyticsPage() {
  const { isAdmin, switchDemoUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await getAnalyticsSummary();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 voodoo-card text-center space-y-4">
        <h2 className="text-xl font-bold text-neutral-900">Admin Privileges Required</h2>
        <p className="text-sm text-neutral-500">
          Analytics dashboard is reserved for Club Administrators.
        </p>
        <button
          onClick={() => switchDemoUser('admin')}
          className="btn-primary text-xs w-full py-2.5"
        >
          Switch to Admin to View Analytics
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-neutral-500">Calculating analytics and participation metrics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1 rounded bg-primary-100 text-primary-700">
            <BarChart3 className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-700">
            Club Performance
          </span>
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
          ATC Growth & Engagement Analytics
        </h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Live statistics on event attendance rates, resource downloads, and student community expansion.
        </p>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="voodoo-card p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">Total Members</span>
            <Users className="w-5 h-5 text-primary-500" />
          </div>
          <p className="text-3xl font-bold text-neutral-900">{data.totalMembers || 5}</p>
          <p className="text-[11px] text-success-600 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +18% active growth this month
          </p>
        </div>

        <div className="voodoo-card p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">Event RSVPs</span>
            <Calendar className="w-5 h-5 text-warning-500" />
          </div>
          <p className="text-3xl font-bold text-neutral-900">{data.totalRegistrations || 6}</p>
          <p className="text-[11px] text-neutral-500 mt-1">Across {data.totalEvents} scheduled sessions</p>
        </div>

        <div className="voodoo-card p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">Resources Downloaded</span>
            <Download className="w-5 h-5 text-success-500" />
          </div>
          <p className="text-3xl font-bold text-neutral-900">{data.totalDownloads || 865}</p>
          <p className="text-[11px] text-success-600 font-medium mt-1">Guides, decks & starter repos</p>
        </div>

        <div className="voodoo-card p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">Announcements</span>
            <Sparkles className="w-5 h-5 text-info-500" />
          </div>
          <p className="text-3xl font-bold text-neutral-900">{data.totalAnnouncements || 3}</p>
          <p className="text-[11px] text-primary-600 font-medium mt-1">Realtime broadcast active</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Event Capacity & Attendance Fill Rates */}
        <div className="lg:col-span-2 voodoo-card p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h3 className="text-base font-bold text-neutral-900 uppercase tracking-wider">
              Event Registration Fill Rates
            </h3>
            <span className="text-xs text-neutral-400 font-medium">Capacity Utilization</span>
          </div>

          <div className="space-y-4">
            {(data.eventBreakdown || []).map((evt) => (
              <div key={evt.id} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-neutral-800 line-clamp-1">{evt.title}</span>
                  <span className="text-neutral-500 shrink-0 ml-2">
                    <strong className="text-neutral-900">{evt.registered}</strong> / {evt.capacity} ({evt.fillRate}%)
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      evt.fillRate > 80 ? 'bg-danger-500' : evt.fillRate > 50 ? 'bg-primary-500' : 'bg-success-500'
                    }`}
                    style={{ width: `${Math.min(100, evt.fillRate)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Department Distribution */}
        <div className="voodoo-card p-6 space-y-6">
          <div className="pb-3 border-b border-neutral-100">
            <h3 className="text-base font-bold text-neutral-900 uppercase tracking-wider">
              Student Departments
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">Enrolled member disciplines</p>
          </div>

          <div className="space-y-3">
            {Object.entries(data.departmentStats || {}).map(([dept, count], idx) => (
              <div key={idx} className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-neutral-800">{dept}</span>
                  <span className="font-bold text-primary-600">{count} students</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
