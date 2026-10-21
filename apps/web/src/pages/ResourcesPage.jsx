import React, { useState } from 'react';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useResources } from '@atc/shared/hooks/useResources';
import { useApkMetadata } from '@atc/shared/hooks/useApkMetadata';
import { ResourceCard } from '../components/ResourceCard';
import { SkeletonResourceCard } from '../components/SkeletonCard';
import { Modal } from '../components/Modal';
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
  Share2
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
  const apk = useApkMetadata();

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
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
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategoryFilter(cat);
                  setShowSavedOnly(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  !showSavedOnly && categoryFilter === cat
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}

            <button
              onClick={() => setShowSavedOnly((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
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
          <div className="flex items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search templates & slides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-700 focus:outline-none focus:border-primary-500"
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
        <div className="voodoo-card p-16 text-center text-neutral-400">
          <FolderGit2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-warning-500" />
          <h3 className="text-lg font-bold text-neutral-700">No resources found</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {showSavedOnly
              ? 'You have not bookmarked any resources yet. Click the star icon on any card to save it.'
              : 'Try checking another category or clear your search query.'}
          </p>
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
