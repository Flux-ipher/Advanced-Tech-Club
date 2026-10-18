import React, { useState } from 'react';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useAnnouncements } from '@atc/shared/hooks/useAnnouncements';
import { useEvents } from '@atc/shared/hooks/useEvents';
import { useResources } from '@atc/shared/hooks/useResources';
import { getEventRegistrations } from '@atc/shared/api/events';
import { formatDate } from '@atc/shared/utils/formatters';
import {
  Shield,
  PlusCircle,
  Calendar,
  FolderGit2,
  Users,
  CheckCircle2,
  Download,
  AlertTriangle,
  Pin,
  Image as ImageIcon,
  Send
} from 'lucide-react';

export function AdminPage() {
  const { user, isAdmin, switchDemoUser } = useAuth();
  const { addAnnouncement } = useAnnouncements();
  const { events, addEvent } = useEvents();
  const { addResource } = useResources();

  const [activeTab, setActiveTab] = useState('announcement'); // 'announcement' | 'event' | 'resource' | 'registrations'

  // Post Announcement State
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annCategory, setAnnCategory] = useState('general');
  const [annPinned, setAnnPinned] = useState(false);
  const [annMedia, setAnnMedia] = useState('');
  const [annSuccess, setAnnSuccess] = useState(false);

  // Create Event State
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtBanner, setEvtBanner] = useState('');
  const [evtStart, setEvtStart] = useState('');
  const [evtEnd, setEvtEnd] = useState('');
  const [evtLocation, setEvtLocation] = useState('');
  const [evtCapacity, setEvtCapacity] = useState('100');
  const [evtCategory, setEvtCategory] = useState('technical');
  const [evtSuccess, setEvtSuccess] = useState(false);

  // Upload Resource State
  const [resTitle, setResTitle] = useState('');
  const [resDesc, setResDesc] = useState('');
  const [resCategory, setResCategory] = useState('Slides');
  const [resUrl, setResUrl] = useState('');
  const [resSize, setResSize] = useState('3.5 MB');
  const [resSuccess, setResSuccess] = useState(false);

  // Event Registrations Inspector State
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  const loadRegistrations = async (eventId) => {
    if (!eventId) return;
    try {
      setLoadingRegs(true);
      const data = await getEventRegistrations(eventId);
      setRegistrations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRegs(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'registrations' && events.length > 0) {
      const targetId = selectedEventId || events[0].id;
      setSelectedEventId(targetId);
      loadRegistrations(targetId);
    }
  }, [activeTab, events]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 voodoo-card text-center space-y-4">
        <div className="w-12 h-12 bg-danger-50 text-danger-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">Admin Privileges Required</h2>
        <p className="text-sm text-neutral-500">
          You are currently signed in as a standard member (<strong>{user?.full_name}</strong>). Only club leads and administrators have access to publishing tools.
        </p>
        <div className="pt-2">
          <button
            onClick={() => switchDemoUser('admin')}
            className="btn-primary text-xs w-full py-2.5"
          >
            Switch to Admin (Sarah Chen) to Continue
          </button>
        </div>
      </div>
    );
  }

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    await addAnnouncement({
      title: annTitle.trim(),
      body: annBody.trim(),
      category: annCategory,
      pinned: annPinned,
      media_url: annMedia.trim() || null,
      author_id: user?.id,
      author_name: user?.full_name,
      author_role: 'Admin',
      author_avatar: user?.avatar_url
    });
    setAnnSuccess(true);
    setAnnTitle('');
    setAnnBody('');
    setAnnMedia('');
    setAnnPinned(false);
    setTimeout(() => setAnnSuccess(false), 3000);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    await addEvent({
      title: evtTitle.trim(),
      description: evtDesc.trim(),
      banner_url: evtBanner.trim() || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      start_at: new Date(evtStart).toISOString(),
      end_at: evtEnd ? new Date(evtEnd).toISOString() : new Date(evtStart).toISOString(),
      location: evtLocation.trim(),
      capacity: Number(evtCapacity) || 100,
      category: evtCategory,
      author_id: user?.id,
      author_name: user?.full_name
    });
    setEvtSuccess(true);
    setEvtTitle('');
    setEvtDesc('');
    setEvtBanner('');
    setEvtStart('');
    setEvtEnd('');
    setEvtLocation('');
    setTimeout(() => setEvtSuccess(false), 3000);
  };

  const handleUploadResource = async (e) => {
    e.preventDefault();
    await addResource({
      title: resTitle.trim(),
      description: resDesc.trim(),
      category: resCategory,
      file_url: resUrl.trim(),
      file_size: resSize || '1.0 MB',
      author_id: user?.id,
      author_name: user?.full_name
    });
    setResSuccess(true);
    setResTitle('');
    setResDesc('');
    setResUrl('');
    setTimeout(() => setResSuccess(false), 3000);
  };

  const handleExportCSV = () => {
    const selEvent = events.find((e) => e.id === selectedEventId);
    const headers = ['Full Name', 'Email', 'Department', 'Student ID', 'Registered At'];
    const rows = registrations.map((r) => [
      `"${r.full_name || ''}"`,
      `"${r.email || ''}"`,
      `"${r.department || ''}"`,
      `"${r.student_id || ''}"`,
      `"${formatDate(r.registered_at)}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(selEvent?.title || 'event').replace(/\s+/g, '_')}_Attendees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-warning-100 text-warning-700">
              <Shield className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-warning-700">
              ATC Operations Studio
            </span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Club Admin Hub
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Publish announcements, organize workshops, release resource files, and export attendee rosters.
          </p>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex border-b border-neutral-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('announcement')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'announcement'
              ? 'border-primary-500 text-primary-600 bg-primary-50/30'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <PlusCircle className="w-4 h-4" /> Post Announcement
        </button>
        <button
          onClick={() => setActiveTab('event')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'event'
              ? 'border-primary-500 text-primary-600 bg-primary-50/30'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Calendar className="w-4 h-4" /> Create Event
        </button>
        <button
          onClick={() => setActiveTab('resource')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'resource'
              ? 'border-primary-500 text-primary-600 bg-primary-50/30'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <FolderGit2 className="w-4 h-4" /> Upload Resource
        </button>
        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'registrations'
              ? 'border-primary-500 text-primary-600 bg-primary-50/30'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" /> Registrations & Export
        </button>
      </div>

      {/* Tab 1: Post Announcement */}
      {activeTab === 'announcement' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 voodoo-card p-6">
            <h3 className="text-base font-bold text-neutral-900 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-100">
              Create Club Announcement
            </h3>

            {annSuccess && (
              <div className="mb-4 p-3 bg-success-50 border border-success-200 text-success-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Announcement published to live feed!
              </div>
            )}

            <form onSubmit={handlePostAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ⚡ System Design Sprint with Industry Mentors"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Category
                  </label>
                  <select
                    value={annCategory}
                    onChange={(e) => setAnnCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 bg-white"
                  >
                    <option value="general">General</option>
                    <option value="hackathon">Hackathon</option>
                    <option value="workshop">Workshop</option>
                    <option value="opportunity">Opportunity</option>
                    <option value="urgent">Urgent Notice</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={annPinned}
                      onChange={(e) => setAnnPinned(e.target.checked)}
                      className="rounded border-neutral-300 text-primary-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-neutral-800">Pin Announcement</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  Announcement Body *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Details, dates, registration instructions, prerequisites..."
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  Media Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={annMedia}
                  onChange={(e) => setAnnMedia(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button type="submit" className="btn-primary text-sm flex items-center gap-2">
                  <Send className="w-4 h-4" /> Publish Announcement
                </button>
              </div>
            </form>
          </div>

          {/* Right Live Preview */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Live Card Preview
            </h4>
            <div className="voodoo-card p-5 border-neutral-300 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
                  {annCategory}
                </span>
                {annPinned && (
                  <span className="text-[11px] font-bold text-primary-600 flex items-center gap-1">
                    <Pin className="w-3 h-3 fill-current" /> Pinned
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-neutral-900 mb-2">
                {annTitle || 'Announcement Title Preview'}
              </h4>
              <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed">
                {annBody || 'The content of your announcement will appear here exactly as club members will see it.'}
              </p>
              {annMedia && (
                <img
                  src={annMedia}
                  alt="Preview"
                  className="mt-3 rounded-lg w-full h-32 object-cover border border-neutral-200"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Create Event */}
      {activeTab === 'event' && (
        <div className="voodoo-card p-6 max-w-3xl">
          <h3 className="text-base font-bold text-neutral-900 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-100">
            Publish New Event or Workshop
          </h3>

          {evtSuccess && (
            <div className="mb-4 p-3 bg-success-50 border border-success-200 text-success-700 text-xs font-semibold rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Event published! Notifications triggered for members.
            </div>
          )}

          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Docker & Kubernetes Hands-on Cluster Lab"
                value={evtTitle}
                onChange={(e) => setEvtTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  Category
                </label>
                <select
                  value={evtCategory}
                  onChange={(e) => setEvtCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 bg-white"
                >
                  <option value="technical">Technical Session</option>
                  <option value="workshop">Hands-on Workshop</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="speaker_session">Speaker Session</option>
                  <option value="social">Social & Mixer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  Capacity (Spots)
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={evtCapacity}
                  onChange={(e) => setEvtCapacity(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={evtStart}
                  onChange={(e) => setEvtStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={evtEnd}
                  onChange={(e) => setEvtEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Venue Location *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CS Lab 202 or Zoom link"
                value={evtLocation}
                onChange={(e) => setEvtLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Description *
              </label>
              <textarea
                required
                rows={3}
                placeholder="What attendees will learn..."
                value={evtDesc}
                onChange={(e) => setEvtDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Banner Image URL
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={evtBanner}
                onChange={(e) => setEvtBanner(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button type="submit" className="btn-primary text-sm">
                Schedule Event
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Upload Resource */}
      {activeTab === 'resource' && (
        <div className="voodoo-card p-6 max-w-2xl">
          <h3 className="text-base font-bold text-neutral-900 uppercase tracking-wider mb-4 pb-2 border-b border-neutral-100">
            Add New Knowledge Resource
          </h3>

          {resSuccess && (
            <div className="mb-4 p-3 bg-success-50 border border-success-200 text-success-700 text-xs font-semibold rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Resource added to club library!
            </div>
          )}

          <form onSubmit={handleUploadResource} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Resource Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Full-Stack Supabase + React Native Template"
                value={resTitle}
                onChange={(e) => setResTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  Category
                </label>
                <select
                  value={resCategory}
                  onChange={(e) => setResCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 bg-white"
                >
                  <option value="Slides">Slides</option>
                  <option value="Cheat Sheets">Cheat Sheets</option>
                  <option value="Code Samples">Code Samples</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Roadmaps">Roadmaps</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                  File Size
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4.2 MB"
                  value={resSize}
                  onChange={(e) => setResSize(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary..."
                value={resDesc}
                onChange={(e) => setResDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Download URL *
              </label>
              <input
                type="url"
                required
                placeholder="https://github.com/... or cloud storage URL"
                value={resUrl}
                onChange={(e) => setResUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button type="submit" className="btn-primary text-sm">
                Save & Publish Resource
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Registrations Inspector */}
      {activeTab === 'registrations' && (
        <div className="voodoo-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <h3 className="text-base font-bold text-neutral-900 uppercase tracking-wider">
                Event Attendees & Check-in
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Inspect registered students per event and download CSV spreadsheets.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  loadRegistrations(e.target.value);
                }}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 bg-white"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({evt.registrations_count || 0})
                  </option>
                ))}
              </select>

              <button
                onClick={handleExportCSV}
                className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          {loadingRegs ? (
            <div className="py-12 text-center text-xs text-neutral-400">Loading registrations...</div>
          ) : registrations.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              No registrations recorded for this event yet.
            </div>
          ) : (
            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">RSVP Time</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {registrations.map((r, i) => (
                    <tr key={i} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-neutral-900">{r.full_name}</td>
                      <td className="px-4 py-3 text-neutral-600">{r.email}</td>
                      <td className="px-4 py-3 text-neutral-600">{r.department || 'Computer Science'}</td>
                      <td className="px-4 py-3 text-neutral-500">{r.student_id || 'ID-NA'}</td>
                      <td className="px-4 py-3 text-neutral-400">{formatDate(r.registered_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-success-50 text-success-700 border border-success-200">
                          Confirmed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPage;
