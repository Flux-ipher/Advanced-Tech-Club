import React, { useState } from 'react';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useEvents } from '@atc/shared/hooks/useEvents';
import { EventCard } from '../components/EventCard';
import { SkeletonEventCard } from '../components/SkeletonCard';
import { Modal } from '../components/Modal';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2
} from 'lucide-react';

export function EventsPage() {
  const { user, isAdmin } = useAuth();
  const {
    events,
    loading,
    isUserRegistered,
    register,
    unregister,
    addEvent,
    removeEvent
  } = useEvents();

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'upcoming' | 'all'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Event Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [category, setCategory] = useState('technical');
  const [submitting, setSubmitting] = useState(false);

  // Filter logic
  const filteredEvents = events.filter((evt) => {
    const matchesCategory =
      categoryFilter === 'all' ? true : evt.category === categoryFilter;

    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchQuery.toLowerCase());

    const isCompleted = evt.is_completed === true || new Date(evt.end_at || evt.start_at).getTime() < Date.now();
    let matchesTime = true;
    if (timeFilter === 'upcoming') {
      matchesTime = !isCompleted;
    } else if (timeFilter === 'completed') {
      matchesTime = isCompleted;
    }

    return matchesCategory && matchesSearch && matchesTime;
  });

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startAt || !location.trim()) return;

    try {
      setSubmitting(true);
      await addEvent({
        title: title.trim(),
        description: description.trim(),
        banner_url:
          bannerUrl.trim() ||
          'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
        start_at: new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : new Date(startAt).toISOString(),
        location: location.trim(),
        capacity: Number(capacity) || 100,
        category,
        author_id: user?.id || 'admin',
        author_name: user?.full_name || 'Club Lead'
      });
      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setBannerUrl('');
      setStartAt('');
      setEndAt('');
      setLocation('');
      setCapacity('100');
    } catch (err) {
      alert(err.message || 'Error creating event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-primary-100 text-primary-600">
              <Calendar className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
              Campus Events & Sprints
            </span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Club Events & Workshops
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Browse upcoming technical workshops, hackathons, and speaker sessions. RSVP with 1-tap.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary self-start md:self-auto text-sm shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Event
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="voodoo-card p-4 mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category filters */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {['all', 'technical', 'workshop', 'hackathon', 'social'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors shrink-0 ${
                categoryFilter === cat
                  ? 'bg-primary-500 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat === 'all' ? 'All Types' : cat}
            </button>
          ))}
        </div>

        {/* Right Search & Time toggles */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center justify-between bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs w-full sm:w-auto">
            <button
              onClick={() => setTimeFilter('all')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium text-center transition-colors ${
                timeFilter === 'all' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setTimeFilter('upcoming')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium text-center transition-colors ${
                timeFilter === 'upcoming' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setTimeFilter('completed')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 ${
                timeFilter === 'completed' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <span>Completed</span>
              <span className="text-[10px]">🏁</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonEventCard key={i} />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="voodoo-card p-16 text-center text-neutral-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary-500" />
          <h3 className="text-lg font-bold text-neutral-700">No events matched</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            There are no events matching your selected filter. Check back soon for announcements on new workshops!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => (
            <EventCard
              key={evt.id}
              event={evt}
              isRegistered={isUserRegistered(evt.id)}
              onRegister={register}
              onUnregister={unregister}
              isAdmin={isAdmin}
              onDelete={removeEvent}
            />
          ))}
        </div>
      )}

      {/* Create Event Modal (Admin & Super Admin) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule New Club Event"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Next.js 15 & Supabase Deep Dive"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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
                Max Capacity
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
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
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
              Venue / Location *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Turing Auditorium Room 302 or Zoom link"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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
              placeholder="What will attendees learn, what should they bring..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
              Banner Image URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-sm"
            >
              {submitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default EventsPage;
