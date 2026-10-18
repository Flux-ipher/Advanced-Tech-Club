import React, { useState } from 'react';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { useResources } from '@atc/shared/hooks/useResources';
import { ResourceCard } from '../components/ResourceCard';
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
  Sparkles
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

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // New Resource Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Slides');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState('2.5 MB');
  const [submitting, setSubmitting] = useState(false);

  const categories = ['All', 'Slides', 'Cheat Sheets', 'Code Samples', 'Documentation', 'Roadmaps'];

  const filteredResources = resources.filter((res) => {
    const matchesCategory =
      categoryFilter === 'All' ? true : res.category === categoryFilter;

    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.description && res.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
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

        {isAdmin && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-primary self-start md:self-auto text-sm shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Upload New Resource
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="voodoo-card p-4 mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search documents and templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="voodoo-card p-12 text-center text-neutral-400">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm">Fetching club resources...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="voodoo-card p-16 text-center text-neutral-400">
          <FolderGit2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-warning-500" />
          <h3 className="text-lg font-bold text-neutral-700">No resources found</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Try checking another category or clear your search query.
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
            />
          ))}
        </div>
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
