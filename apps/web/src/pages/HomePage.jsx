import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useAnnouncements } from '@atc/shared/hooks/useAnnouncements';
import { useEvents } from '@atc/shared/hooks/useEvents';
import { useResources } from '@atc/shared/hooks/useResources';
import { useApkMetadata } from '@atc/shared/hooks/useApkMetadata';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { SkeletonAnnouncementCard } from '../components/SkeletonCard';
import { Modal } from '../components/Modal';
import { ImageUploader } from '../components/ImageUploader';
import {
  Sparkles,
  Pin,
  Calendar,
  FolderGit2,
  Plus,
  Radio,
  Search,
  Filter,
  Users,
  Trophy,
  ArrowRight,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';

export function HomePage() {
  const { user, isAdmin } = useAuth();
  const {
    announcements,
    loading,
    addAnnouncement,
    removeAnnouncement,
    pinAnnouncement
  } = useAnnouncements();
  const { events, isUserRegistered, register, unregister } = useEvents();
  const { resources, downloadResource } = useResources();
  const apk = useApkMetadata();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // New announcement form state
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newPinned, setNewPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filter announcements
  const filteredAnnouncements = announcements.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all'
        ? true
        : selectedCategory === 'pinned'
        ? item.pinned
        : item.category === selectedCategory;

    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.body.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const pinnedList = filteredAnnouncements.filter((a) => a.pinned);
  const unpinnedList = filteredAnnouncements.filter((a) => !a.pinned);

  // Spotlight upcoming event
  const upcomingEvent = events[0];

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;

    try {
      setSubmitting(true);
      await addAnnouncement({
        title: newTitle.trim(),
        body: newBody.trim(),
        category: newCategory,
        media_url: newMediaUrl.trim() || null,
        pinned: newPinned,
        author_id: user?.id || 'admin',
        author_name: user?.full_name || 'Admin',
        author_role: 'Admin',
        author_avatar: user?.avatar_url
      });
      setIsPostModalOpen(false);
      setNewTitle('');
      setNewBody('');
      setNewMediaUrl('');
      setNewPinned(false);
    } catch (err) {
      alert(err.message || 'Error creating announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Welcome Banner */}
      <section className="mb-8 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 text-white p-6 sm:p-8 shadow-card border border-neutral-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-500/20 text-primary-300 border border-primary-500/30">
                <Radio className="w-3 h-3 text-primary-400 animate-pulse" />
                Live Realtime Feed
              </span>
              <span className="text-xs text-neutral-400">Spring Semester 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome to Advanced Tech Club
            </h1>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Your central hub for campus hackathons, engineering workshops, slide decks, and developer community.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="btn-primary text-sm shadow-md flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Post Announcement
              </button>
            )}
            <Link
              to="/events"
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700 transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              Explore Events <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-800 text-xs">
          <div>
            <p className="text-neutral-400">Club Members</p>
            <p className="text-lg font-bold text-white mt-0.5">380+ Students</p>
          </div>
          <div>
            <p className="text-neutral-400">Upcoming Hackathon</p>
            <p className="text-lg font-bold text-primary-400 mt-0.5">$5,000 Prizes</p>
          </div>
          <div>
            <p className="text-neutral-400">Hands-on Workshops</p>
            <p className="text-lg font-bold text-white mt-0.5">Every Friday</p>
          </div>
          <div>
            <p className="text-neutral-400">Shared Resources</p>
            <p className="text-lg font-bold text-success-400 mt-0.5">25+ Guides</p>
          </div>
        </div>
      </section>

      {/* Main Grid: Feed + Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Feed Filter & Search Controls */}
          <div className="voodoo-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Category Pills */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {['all', 'pinned', 'hackathon', 'workshop', 'opportunity'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-primary-500 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {cat === 'all' ? 'All Feed' : cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          {/* Announcements List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <SkeletonAnnouncementCard key={i} />
              ))}
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="voodoo-card p-12 text-center text-neutral-400">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30 text-primary-500" />
              <h3 className="text-base font-semibold text-neutral-700">No announcements found</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Try adjusting your search query or category filter.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pinned first */}
              {pinnedList.map((ann) => (
                <AnnouncementCard
                  key={ann.id}
                  announcement={ann}
                  isAdmin={isAdmin}
                  onPin={pinAnnouncement}
                  onDelete={removeAnnouncement}
                />
              ))}

              {/* Unpinned */}
              {unpinnedList.map((ann) => (
                <AnnouncementCard
                  key={ann.id}
                  announcement={ann}
                  isAdmin={isAdmin}
                  onPin={pinAnnouncement}
                  onDelete={removeAnnouncement}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Spotlight & Quick Access Sidebar */}
        <aside className="space-y-6">
          {/* Spotlight Event Card */}
          {upcomingEvent && (
            <div className="voodoo-card overflow-hidden">
              <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  Spotlight Event
                </span>
                <span className="text-[11px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                  Featured
                </span>
              </div>

              <div className="relative h-36 bg-neutral-100">
                <img
                  src={upcomingEvent.banner_url}
                  alt={upcomingEvent.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-4">
                <h4 className="font-bold text-neutral-900 text-sm mb-1 leading-snug">
                  {upcomingEvent.title}
                </h4>
                <p className="text-xs text-neutral-500 line-clamp-2 mb-3">
                  {upcomingEvent.description}
                </p>

                <div className="text-xs text-neutral-600 space-y-1 mb-4">
                  <p>📍 {upcomingEvent.location}</p>
                  <p>👥 {upcomingEvent.registrations_count || 0} students RSVP'd</p>
                </div>

                {isUserRegistered(upcomingEvent.id) ? (
                  <button
                    onClick={() => unregister(upcomingEvent.id)}
                    className="w-full py-2 text-xs font-semibold rounded-lg bg-danger-50 text-danger-700 hover:bg-danger-100 border border-danger-200 transition-colors"
                  >
                    Cancel My RSVP
                  </button>
                ) : (
                  <button
                    onClick={() => register(upcomingEvent.id)}
                    className="w-full btn-primary text-xs py-2 shadow-sm"
                  >
                    1-Tap RSVP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Resources Spotlight */}
          <div className="voodoo-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <FolderGit2 className="w-4 h-4 text-warning-600" />
                Latest Resources
              </h4>
              <Link to="/resources" className="text-xs font-semibold text-primary-600 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {resources.slice(0, 3).map((res) => (
                <div
                  key={res.id}
                  onClick={() => downloadResource(res)}
                  className="p-3 rounded-lg border border-neutral-100 hover:border-neutral-200 bg-neutral-50/50 hover:bg-white cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary-600 uppercase">
                      {res.category}
                    </span>
                    <span className="text-[11px] text-neutral-400">{res.file_size}</span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-900 mt-1 line-clamp-1 group-hover:text-primary-600 transition-colors">
                    {res.title}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile APK Download Card */}
          <div className="voodoo-card p-5 bg-gradient-to-br from-neutral-900 via-neutral-900 to-primary-950 text-white border-neutral-800 shadow-xl relative overflow-hidden group">
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-primary-500/10 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400 bg-primary-500/20 px-2 py-0.5 rounded border border-primary-500/30">
                Standalone Release v{apk.version}
              </span>
              <span className="text-[11px] font-mono text-neutral-400">{apk.size}</span>
            </div>
            <h4 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
              Install ATC Android App
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed mb-4">
              Get real-time push alerts for urgent campus hackathons, 1-tap workshop registrations, and offline member vault access.
            </p>
            <div className="space-y-2">
              <a
                href={apk.downloadUrl}
                download={apk.fileName}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold transition-all shadow-md shadow-primary-500/20 active:scale-[0.98]"
              >
                Download Standalone APK ({apk.sizeShort})
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.origin + apk.downloadUrl);
                  alert('Direct APK download link copied to clipboard!');
                }}
                className="w-full py-1.5 text-[11px] text-neutral-400 hover:text-white transition-colors text-center"
              >
                Copy Direct APK Link
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Post Announcement Modal (Admin & Super Admin) */}
      <Modal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        title="Post Club Announcement"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
              Announcement Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 🚀 Spring Hackathon 2026 Registration Open"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 bg-white"
              >
                <option value="general">General</option>
                <option value="hackathon">Hackathon</option>
                <option value="workshop">Workshop</option>
                <option value="opportunity">Opportunity</option>
                <option value="urgent">Urgent Notice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Pin Priority
              </label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPinned}
                  onChange={(e) => setNewPinned(e.target.checked)}
                  className="rounded border-neutral-300 text-primary-500 focus:ring-primary-500 w-4 h-4"
                />
                <span className="text-xs text-neutral-700 font-medium">Pin to top of feed</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
              Body Message *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Write the details of the announcement..."
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <ImageUploader
              mode="banner"
              label="Announcement Media / Picture (Optional)"
              helperText="Upload event flyer, workshop diagram, or hackathon graphic (PNG, JPG, WEBP, GIF up to 5MB)."
              value={newMediaUrl}
              onChange={(newMedia) => setNewMediaUrl(newMedia)}
              presets={[
                'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80'
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsPostModalOpen(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-sm"
            >
              {submitting ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default HomePage;
