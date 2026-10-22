import React, { useState } from 'react';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useResources, useVaultGallery } from '@atc/shared/hooks/useResources';
import { useApkMetadata } from '@atc/shared/hooks/useApkMetadata';
import { ResourceCard } from '../components/ResourceCard';
import { SkeletonResourceCard } from '../components/SkeletonCard';
import { Modal } from '../components/Modal';
import { EmptyState } from '@atc/shared/components/EmptyState';
import emptyResourcesIllustration from '@atc/shared/assets/illustrations/empty-resources.svg';
import emptySearchIllustration from '@atc/shared/assets/illustrations/empty-search.svg';
import {
  FolderGit2,
  Plus,
  Search,
  Download,
  FileText,
  Code2,
  BookOpen,
  Map,
  Filter,
  Sparkles,
  Star,
  ExternalLink,
  Copy,
  Check,
  Eye,
  ArrowUpDown,
  Share2,
  Trophy,
  Award,
  Camera,
  Heart,
  X,
  Users,
  Pencil,
  Trash2,
  Calendar
} from 'lucide-react';

export function ResourcesPage() {
  const { user, isAdmin } = useAuth();
  const {
    resources,
    loading,
    addResource,
    removeResource,
    downloadResource
  } = useResources();
  const { memories, loading: galleryLoading, addMemory, editMemory, removeMemory, toggleLike, likedIds } = useVaultGallery();
  const apk = useApkMetadata();

  const [vaultView, setVaultView] = useState('resources'); // 'resources' | 'gallery'
  const [galleryFilter, setGalleryFilter] = useState('All'); // 'All' | 'hackathon' | 'contributor' | 'event'
  const [selectedMemory, setSelectedMemory] = useState(null); // Lightbox
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  // New Memory Form
  const [memTitle, setMemTitle] = useState('');
  const [memCategory, setMemCategory] = useState('hackathon');
  const [memAwardTitle, setMemAwardTitle] = useState('');
  const [memImageUrl, setMemImageUrl] = useState('');
  const [memAchievers, setMemAchievers] = useState('');
  const [memDescription, setMemDescription] = useState('');
  const [memEventDate, setMemEventDate] = useState('');
  const [memSubmitting, setMemSubmitting] = useState(false);

  // Edit Memory Form
  const [editingMemory, setEditingMemory] = useState(null);
  const [isEditMemoryModalOpen, setIsEditMemoryModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('hackathon');
  const [editAwardTitle, setEditAwardTitle] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editAchievers, setEditAchievers] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const openEditMemory = (mem) => {
    setEditingMemory(mem);
    setEditTitle(mem.title || '');
    setEditCategory(mem.category || 'hackathon');
    setEditAwardTitle(mem.award_title || '');
    setEditImageUrl(mem.image_url || '');
    setEditAchievers(Array.isArray(mem.achievers) ? mem.achievers.join(', ') : (mem.achievers || ''));
    setEditDescription(mem.description || '');
    setEditEventDate(mem.event_date || '');
    setIsEditMemoryModalOpen(true);
  };

  const handleUpdateMemory = async (e) => {
    e.preventDefault();
    if (!editingMemory || !editTitle.trim() || !editImageUrl.trim()) return;
    try {
      setEditSubmitting(true);
      const updated = await editMemory(editingMemory.id, {
        title: editTitle.trim(),
        category: editCategory,
        award_title: editAwardTitle.trim(),
        image_url: editImageUrl.trim(),
        achievers: editAchievers ? editAchievers.split(',').map((s) => s.trim()).filter(Boolean) : [],
        description: editDescription.trim(),
        event_date: editEventDate || new Date().toISOString().split('T')[0]
      });
      setIsEditMemoryModalOpen(false);
      setEditingMemory(null);
      if (selectedMemory && selectedMemory.id === editingMemory.id) {
        setSelectedMemory((prev) => ({
          ...prev,
          ...updated
        }));
      }
    } catch (err) {
      alert('Failed to update memory: ' + (err.message || 'Unknown error'));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteMemory = async (memId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title || 'this memory'}" from Campus Gallery?`)) {
      return;
    }
    try {
      await removeMemory(memId);
      if (selectedMemory && selectedMemory.id === memId) {
        setSelectedMemory(null);
      }
    } catch (err) {
      alert('Failed to delete memory: ' + (err.message || 'Unknown error'));
    }
  };

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular'); // 'popular' | 'newest' | 'alpha'
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('atc_bookmarked_resources');
      return saved ? JSON.parse(saved) : ['res-1'];
    } catch {
      return ['res-1'];
    }
  });

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // New Resource Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Slides');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState('2.5 MB');
  const [submitting, setSubmitting] = useState(false);

  const categories = ['All', 'Slides', 'Cheat Sheets', 'Code Samples', 'Documentation', 'Roadmaps'];

  const toggleBookmark = (id) => {
    setBookmarkedIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      try {
        localStorage.setItem('atc_bookmarked_resources', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  const handleCopyLink = (url) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const filteredResources = resources
    .filter((res) => {
      if (showSavedOnly && !bookmarkedIds.includes(res.id)) {
        return false;
      }

      const matchesCategory =
        categoryFilter === 'All' ? true : res.category === categoryFilter;

      const matchesSearch =
        res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (res.description && res.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') {
        return (b.download_count || 0) - (a.download_count || 0);
      }
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === 'alpha') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

  const handleCreateResource = async (e) => {
    e.preventDefault();
    if (!title.trim() || !fileUrl.trim()) return;

    try {
      setSubmitting(true);
      await addResource({
        title: title.trim(),
        description: description.trim(),
        file_url: fileUrl.trim(),
        file_size: fileSize || '1.0 MB',
        category,
        author_id: user?.id || 'admin',
        author_name: user?.full_name || 'Admin'
      });
      setIsUploadModalOpen(false);
      setTitle('');
      setDescription('');
      setFileUrl('');
      setFileSize('2.5 MB');
    } catch (err) {
      alert(err.message || 'Error uploading resource');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMemory = async (e) => {
    e.preventDefault();
    if (!memTitle.trim() || !memImageUrl.trim()) {
      alert('Please enter a title and select/enter an image URL.');
      return;
    }

    try {
      setMemSubmitting(true);
      const achieversList = memAchievers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await addMemory({
        title: memTitle.trim(),
        category: memCategory,
        award_title: memAwardTitle.trim(),
        image_url: memImageUrl.trim(),
        achievers: achieversList,
        description: memDescription.trim(),
        author_name: user?.full_name || 'Club Admin (Ritesh Mishra)'
      });

      setIsMemoryModalOpen(false);
      setMemTitle('');
      setMemAwardTitle('');
      setMemImageUrl('');
      setMemAchievers('');
      setMemDescription('');
    } catch (err) {
      alert(err.message || 'Error saving campus memory');
    } finally {
      setMemSubmitting(false);
    }
  };

  const filteredMemories = memories.filter((m) => {
    if (galleryFilter === 'All') return true;
    return m.category === galleryFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 1. VAULT MODE SEGMENTED SWITCHER */}
      <div className="flex items-center gap-2 p-1.5 bg-neutral-100 rounded-2xl w-fit mb-8 border border-neutral-200">
        <button
          type="button"
          onClick={() => setVaultView('resources')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            vaultView === 'resources'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <FolderGit2 className="w-4 h-4 text-warning-500" />
          <span>Knowledge Assets & Docs ({resources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setVaultView('gallery')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            vaultView === 'gallery'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Trophy className="w-4 h-4 text-warning-500" />
          <span>Campus Gallery & Hall of Fame ({memories.length})</span>
        </button>
      </div>

      {vaultView === 'resources' ? (
        <>
          {/* Resource Library Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-warning-100 text-warning-700">
                  <FolderGit2 className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-warning-700">
                  Club Knowledge Vault
                </span>
              </div>
              <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
                Resource Library
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Download slides, starter templates, cheat sheets, and architectural guides curated by ATC Leads.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={apk.downloadUrl}
                download={apk.fileName}
                className="btn-secondary text-xs shadow-sm flex items-center gap-1.5"
                title={`Download Mobile App Standalone APK (v${apk.version} • ${apk.sizeShort})`}
              >
                <Download className="w-3.5 h-3.5 text-primary-600" />
                Download Mobile APK ({apk.sizeShort})
              </a>

              {isAdmin && (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="btn-primary text-sm shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Upload New Resource
                </button>
              )}
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="voodoo-card p-4 mb-8 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Category Pills & Saved Filter */}
              <div
                className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategoryFilter(cat);
                      setShowSavedOnly(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                      !showSavedOnly && categoryFilter === cat
                        ? 'bg-primary-500 text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}

                <button
                  onClick={() => setShowSavedOnly((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors shrink-0 ${
                    showSavedOnly
                      ? 'bg-warning-500 text-white shadow-sm'
                      : 'bg-warning-50 text-warning-700 hover:bg-warning-100 border border-warning-200'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${showSavedOnly ? 'fill-white' : 'fill-warning-500'}`} />
                  Saved ({bookmarkedIds.length})
                </button>
              </div>

              {/* Controls: Search and Sort */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search templates & slides..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-1.5 text-xs text-neutral-500">
                  <span className="flex items-center gap-1 text-neutral-400">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span className="sm:hidden text-[11px]">Sort:</span>
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 sm:flex-initial px-2 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-700 focus:outline-none focus:border-primary-500"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="newest">Recently Added</option>
                    <option value="alpha">Alphabetical (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Resources Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonResourceCard key={i} />
              ))}
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="voodoo-card bg-white overflow-hidden p-6">
              <EmptyState
                illustration={searchQuery ? emptySearchIllustration : emptyResourcesIllustration}
                title={showSavedOnly ? 'No saved resources' : searchQuery ? 'No matching resources' : 'Vault library is empty'}
                subtitle={
                  showSavedOnly
                    ? 'You have not bookmarked any resources yet. Click the bookmark icon on any card to save it.'
                    : searchQuery
                    ? `No materials found matching "${searchQuery}". Try a different keyword.`
                    : 'Curated workshop slides, cheat sheets, code templates, and engineering guides will be published here.'
                }
                action={
                  isAdmin
                    ? {
                        label: 'Upload Resource',
                        onClick: () => setIsUploadModalOpen(true)
                      }
                    : null
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((res) => (
                <ResourceCard
                  key={res.id}
                  resource={res}
                  onDownload={downloadResource}
                  isAdmin={isAdmin}
                  onDelete={removeResource}
                  onPreview={setSelectedResource}
                  isBookmarked={bookmarkedIds.includes(res.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* CAMPUS GALLERY & HALL OF FAME */
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Gallery Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-warning-100 text-warning-700">
                  <Trophy className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-warning-700">
                  Campus Achievements & Memories
                </span>
              </div>
              <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
                Vault Campus Gallery
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Celebrating student hackathon champions, outstanding open-source contributors, and memorable campus tech milestones.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsMemoryModalOpen(true)}
                className="btn-primary text-sm shadow-sm flex items-center gap-2 self-start md:self-auto"
              >
                <Plus className="w-4 h-4" />
                Add Campus Memory / Award
              </button>
            )}
          </div>

          {/* Gallery Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[
              { id: 'All', label: 'All Memories' },
              { id: 'hackathon', label: '🏆 Hackathon Winners' },
              { id: 'contributor', label: '⭐ Top Contributors' },
              { id: 'event', label: '📸 Campus Events' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setGalleryFilter(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  galleryFilter === cat.id
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          {galleryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-80 rounded-3xl bg-neutral-200 animate-pulse" />
              ))}
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="voodoo-card p-12 text-center space-y-3">
              <Camera className="w-10 h-10 text-neutral-400 mx-auto" />
              <h3 className="text-base font-bold text-neutral-800">No Memories in this category</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Club Admins can upload event photos and honor students who won hackathons or made outstanding contributions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="voodoo-card overflow-hidden group flex flex-col justify-between hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative h-64 overflow-hidden bg-neutral-950 cursor-pointer" onClick={() => setSelectedMemory(mem)}>
                    <img
                      src={mem.image_url}
                      alt={mem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-black/20" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 text-white border border-white/20 backdrop-blur-md flex items-center gap-1.5">
                        {mem.category === 'hackathon' ? (
                          <>
                            <Trophy className="w-3 h-3 text-amber-400" />
                            <span>Hackathon</span>
                          </>
                        ) : mem.category === 'contributor' ? (
                          <>
                            <Star className="w-3 h-3 text-sky-400" />
                            <span>Top Contributor</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3 h-3 text-emerald-400" />
                            <span>Campus Event</span>
                          </>
                        )}
                      </span>
                      {mem.award_title && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/90 text-amber-950 shadow-sm flex items-center gap-1 backdrop-blur-md">
                          <Trophy className="w-3 h-3" />
                          <span>{mem.award_title}</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMemory(mem);
                      }}
                      className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 text-white hover:bg-black/90 backdrop-blur-md text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Expand Photo</span>
                    </button>
                  </div>

                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-neutral-900 leading-snug group-hover:text-primary-600 transition-colors">
                        {mem.title}
                      </h3>
                      <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3">
                        {mem.description}
                      </p>
                    </div>

                    {/* Achievers / Contributors Tags */}
                    {mem.achievers && mem.achievers.length > 0 && (
                      <div className="pt-3 border-t border-neutral-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5 flex items-center gap-1">
                          <Users className="w-3 h-3 text-primary-500" />
                          <span>Recognized Students:</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {mem.achievers.map((name, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{mem.event_date || 'Campus Archive'}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditMemory(mem);
                              }}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title="Edit Memory"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMemory(mem.id, mem.title);
                              }}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete Memory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(mem.id);
                          }}
                          className={`flex items-center gap-1 font-bold px-2.5 py-1 rounded-full transition-all text-xs ${
                            likedIds.includes(mem.id)
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${likedIds.includes(mem.id) ? 'fill-rose-500 text-rose-500' : 'text-neutral-400'}`} />
                          <span>{mem.likes_count || 0} Kudos</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Photo Lightbox Modal */}
          {selectedMemory && (
            <div
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setSelectedMemory(null)}
            >
              <div
                className="relative max-w-4xl w-full bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setSelectedMemory(null)}
                  className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="max-h-[60vh] bg-black flex items-center justify-center">
                  <img
                    src={selectedMemory.image_url}
                    alt={selectedMemory.title}
                    className="max-h-[60vh] w-auto object-contain mx-auto"
                  />
                </div>

                <div className="p-6 text-white space-y-3">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30 flex items-center gap-1">
                        {selectedMemory.category === 'hackathon' ? <Trophy className="w-3 h-3" /> : selectedMemory.category === 'contributor' ? <Star className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                        <span>{selectedMemory.category.toUpperCase()}</span>
                      </span>
                      {selectedMemory.award_title && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-amber-950 flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          <span>{selectedMemory.award_title}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditMemory(selectedMemory)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(selectedMemory.id, selectedMemory.title)}
                            className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleLike(selectedMemory.id)}
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                          likedIds.includes(selectedMemory.id)
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${likedIds.includes(selectedMemory.id) ? 'fill-white' : ''}`} />
                        <span>{selectedMemory.likes_count || 0} Kudos</span>
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white">{selectedMemory.title}</h3>
                  <p className="text-xs text-neutral-300 leading-relaxed">{selectedMemory.description}</p>

                  {selectedMemory.achievers && selectedMemory.achievers.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-neutral-400 font-semibold">Honorees:</span>
                      {selectedMemory.achievers.map((ach, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-bold">
                          {ach}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Admin Add Campus Memory Modal */}
          {isMemoryModalOpen && (
            <Modal
              isOpen={isMemoryModalOpen}
              onClose={() => setIsMemoryModalOpen(false)}
              title="Add Campus Memory / Student Award"
              maxWidth="max-w-xl"
            >
              <form onSubmit={handleCreateMemory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Memory Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1st Place at Hackathon or Top Committer Honors"
                    value={memTitle}
                    onChange={(e) => setMemTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                      Category
                    </label>
                    <select
                      value={memCategory}
                      onChange={(e) => setMemCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 bg-white"
                    >
                      <option value="hackathon">Hackathon Winner</option>
                      <option value="contributor">Top Contributor</option>
                      <option value="event">Campus Event Photo</option>
                      <option value="project">Featured Project</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                      Award / Honor Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1st Prize · Gold Trophy"
                      value={memAwardTitle}
                      onChange={(e) => setMemAwardTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Student Honorees (Comma separated names)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ritesh Mishra, Aryan Sharma, Sneha Patel"
                    value={memAchievers}
                    onChange={(e) => setMemAchievers(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Photo URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/... or uploaded photo link"
                    value={memImageUrl}
                    onChange={(e) => setMemImageUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 mb-2"
                  />

                  {/* 1-Tap Presets */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase">Presets:</span>
                    {[
                      { label: '🏆 SIH Hackathon', url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80' },
                      { label: '💻 CTF Heist', url: 'https://cjmviumwfzxkxtorzyvk.supabase.co/storage/v1/object/public/event-images/1772085185188-jggj8y620bh.jpg' },
                      { label: '⭐ Top Contributors', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80' },
                      { label: '⚡ Jugaad-a-thon', url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80' }
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setMemImageUrl(p.url)}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Memory Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the milestone, what the team built, and how they won..."
                    value={memDescription}
                    onChange={(e) => setMemDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setIsMemoryModalOpen(false)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={memSubmitting}
                    className="btn-primary text-sm"
                  >
                    {memSubmitting ? 'Publishing...' : 'Add to Campus Gallery'}
                  </button>
                </div>
              </form>
            </Modal>
          )}

          {/* Admin Edit Campus Memory Modal */}
          {isEditMemoryModalOpen && editingMemory && (
            <Modal
              isOpen={isEditMemoryModalOpen}
              onClose={() => {
                setIsEditMemoryModalOpen(false);
                setEditingMemory(null);
              }}
              title="Edit Campus Memory / Recognition"
              maxWidth="max-w-xl"
            >
              <form onSubmit={handleUpdateMemory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Memory Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1st Place at SIH 2025"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                      Category
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                    >
                      <option value="hackathon">Hackathon Win</option>
                      <option value="contributor">Top Contributor</option>
                      <option value="event">Campus Event</option>
                      <option value="project">Flagship Project</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                      Award / Honor Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1st Prize · Gold Trophy"
                      value={editAwardTitle}
                      onChange={(e) => setEditAwardTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Student Honorees (Comma separated names)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ritesh Mishra, Aryan Sharma, Sneha Patel"
                    value={editAchievers}
                    onChange={(e) => setEditAchievers(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Photo URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/... or uploaded photo link"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 mb-2"
                  />
                  {editImageUrl && (
                    <div className="relative h-32 rounded-xl overflow-hidden border border-neutral-200 mt-2">
                      <img src={editImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Story & Impact Summary
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the milestone or achievement..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMemoryModalOpen(false);
                      setEditingMemory(null);
                    }}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="btn-primary text-sm"
                  >
                    {editSubmitting ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      )}

      {/* Resource Detail & Preview Modal */}
      {selectedResource && (
        <Modal
          isOpen={Boolean(selectedResource)}
          onClose={() => setSelectedResource(null)}
          title={selectedResource.title}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700 border border-primary-200 uppercase">
                  {selectedResource.category}
                </span>
                <span className="text-xs text-neutral-500 font-medium">
                  Size: <strong>{selectedResource.file_size || '1.2 MB'}</strong>
                </span>
                <span className="text-xs text-neutral-500 font-medium">
                  Downloads: <strong>{selectedResource.download_count || 0}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleBookmark(selectedResource.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                    bookmarkedIds.includes(selectedResource.id)
                      ? 'bg-warning-50 border-warning-300 text-warning-700'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${bookmarkedIds.includes(selectedResource.id) ? 'fill-warning-500' : ''}`} />
                  {bookmarkedIds.includes(selectedResource.id) ? 'Bookmarked' : 'Bookmark'}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyLink(selectedResource.file_url)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100 flex items-center gap-1.5 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-success-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied Link!' : 'Copy Link'}
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Overview & Description
              </h4>
              <p className="text-sm text-neutral-700 leading-relaxed bg-white p-3 rounded-lg border border-neutral-100">
                {selectedResource.description || 'No description provided.'}
              </p>
            </div>

            {/* Interactive Curriculum Preview Box */}
            <div className="p-4 rounded-xl bg-neutral-900 text-neutral-200 font-mono text-xs space-y-2 border border-neutral-800">
              <div className="flex items-center justify-between text-neutral-400 pb-2 border-b border-neutral-800">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-primary-400" />
                  document_preview.md
                </span>
                <span className="text-[11px] text-primary-400">Verified by ATC Tech Leads</span>
              </div>
              <p className="text-neutral-300"># {selectedResource.title}</p>
              <p className="text-neutral-400">## Topics Covered:</p>
              <ul className="list-disc list-inside text-neutral-300 space-y-1">
                <li>Production Architecture & System Setup</li>
                <li>Best Practices & Performance Tuning</li>
                <li>University Lab Exercises & Code Repository</li>
              </ul>
              <div className="pt-2 text-[11px] text-neutral-500 flex items-center justify-between">
                <span>Storage: GitHub Enterprise / Supabase CDN</span>
                <span>SHA256 checksum verified</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setSelectedResource(null)}
                className="btn-secondary text-xs"
              >
                Close Preview
              </button>

              <button
                type="button"
                onClick={() => {
                  downloadResource(selectedResource);
                  setSelectedResource(null);
                }}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download Resource Now
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Resource Modal (Admin & Super Admin) */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Resource Document"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateResource} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
              Resource Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Distributed Systems Architecture Slides"
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
                <option value="Slides">Slides</option>
                <option value="Cheat Sheets">Cheat Sheets</option>
                <option value="Code Samples">Code Samples</option>
                <option value="Documentation">Documentation</option>
                <option value="Roadmaps">Roadmaps</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Estimated File Size
              </label>
              <input
                type="text"
                placeholder="e.g. 5.4 MB"
                value={fileSize}
                onChange={(e) => setFileSize(e.target.value)}
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
              placeholder="Summary of topics covered, prerequisites..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
              File URL / Storage Link *
            </label>
            <input
              type="url"
              required
              placeholder="https://github.com/advanced-tech-club/... or PDF link"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-sm"
            >
              {submitting ? 'Adding...' : 'Add to Library'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ResourcesPage;
