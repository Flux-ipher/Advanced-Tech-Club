// apps/web/src/pages/ResourceDetailPage.jsx
// Advanced Tech Club (ATC) — Dedicated Resource & Tooling Details Page

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { getResourceById, getResources, incrementDownloadCount, deleteResource } from '@atc/shared/api/resources';
import { formatRelativeTime } from '@atc/shared/utils/formatters';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  ExternalLink,
  Download,
  Copy,
  Check,
  ShieldCheck,
  HardDrive,
  Eye,
  Calendar,
  Sparkles,
  BookOpen,
  Code2,
  FolderGit2,
  FileText,
  Layers,
  Terminal,
  Cpu,
  Trash2
} from 'lucide-react';

export function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const [resource, setResource] = useState(null);
  const [relatedResources, setRelatedResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const isPortalPath = location.pathname.startsWith('/portal');
  const vaultPath = isPortalPath ? '/portal/resources' : '/resources';

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const data = await getResourceById(id);
        const allRes = await getResources();

        if (!isMounted) return;

        if (!data) {
          setError('Resource not found in the Knowledge Vault.');
        } else {
          setResource(data);
          // Find 3 other resources from same or other categories
          const related = (allRes || [])
            .filter((r) => r.id !== id)
            .slice(0, 3);
          setRelatedResources(related);

          // Check bookmark
          try {
            const raw = localStorage.getItem('atc_bookmarked_resources');
            if (raw) {
              const ids = JSON.parse(raw);
              setIsBookmarked(ids.includes(id));
            }
          } catch (e) {}
        }
      } catch (err) {
        if (isMounted) {
          console.error('[ATC ResourceDetail] load error:', err);
          setError(err.message || 'Failed to load resource details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleToggleBookmark = () => {
    try {
      const raw = localStorage.getItem('atc_bookmarked_resources');
      const ids = raw ? JSON.parse(raw) : [];
      let updated;
      if (ids.includes(id)) {
        updated = ids.filter((i) => i !== id);
        setIsBookmarked(false);
      } else {
        updated = [...ids, id];
        setIsBookmarked(true);
      }
      localStorage.setItem('atc_bookmarked_resources', JSON.stringify(updated));
    } catch (e) {}
  };

  const handlePrimaryAction = async () => {
    if (!resource) return;
    try {
      await incrementDownloadCount(resource.id);
      setResource((prev) => ({
        ...prev,
        download_count: (prev.download_count || 0) + 1
      }));
    } catch (e) {}

    const url = resource.file_url || resource.url;
    if (url && url !== '#') {
      window.open(url, '_blank');
    }
  };

  const handleDeleteResource = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${resource.title}" from the Knowledge Vault?`)) {
      return;
    }
    try {
      await deleteResource(resource.id);
      navigate(vaultPath);
    } catch (err) {
      alert('Failed to delete resource: ' + (err.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-neutral-200 rounded-md" />
        <div className="h-48 bg-neutral-200 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-96 bg-neutral-200 rounded-2xl" />
          <div className="h-96 bg-neutral-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 voodoo-card text-center space-y-4">
        <div className="w-12 h-12 bg-warning-50 text-warning-600 rounded-full flex items-center justify-center mx-auto">
          <FolderGit2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">Resource Not Found</h2>
        <p className="text-sm text-neutral-500">
          The requested engineering asset or document could not be located in the Knowledge Vault.
        </p>
        <div className="pt-2">
          <Link to={vaultPath} className="btn-primary text-xs w-full py-2.5 inline-block text-center">
            ← Return to Vault Library
          </Link>
        </div>
      </div>
    );
  }

  const {
    title,
    description,
    file_url = '#',
    file_size = 'Web Asset',
    category = 'Documentation',
    download_count = 0,
    created_at,
    author_name = 'ATC Engineering Lead'
  } = resource;

  const isGithub = file_url && (file_url.includes('github.com') || file_url.includes('gitlab.com'));
  const isArticle = file_url && (file_url.includes('medium.com') || file_url.includes('dev.to') || file_url.includes('substack.com') || file_url.includes('docs.') || category === 'Documentation');
  const isTool = file_url && (file_url.includes('metaflow.org') || file_url.includes('mlflow.org') || file_url.includes('feast.dev') || (file_url.startsWith('http') && !file_url.match(/\.(pdf|zip|docx|pptx|gz|tar)$/i) && !isGithub && !isArticle));

  const getPrimaryActionDetails = () => {
    if (isGithub) {
      return {
        label: 'Open GitHub Repository',
        subtext: 'Inspect code, clone & fork',
        icon: <FolderGit2 className="w-4 h-4" />
      };
    }
    if (isArticle) {
      return {
        label: 'Read Full Documentation',
        subtext: 'Opens documentation in new tab',
        icon: <BookOpen className="w-4 h-4" />
      };
    }
    if (isTool) {
      return {
        label: 'Launch Web Platform',
        subtext: 'Open live interactive framework',
        icon: <ExternalLink className="w-4 h-4" />
      };
    }
    return {
      label: `Download Asset (${file_size})`,
      subtext: 'Direct high-speed campus download',
      icon: <Download className="w-4 h-4" />
    };
  };

  const action = getPrimaryActionDetails();

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      {/* 1. TOP BREADCRUMB & ACTIONS */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={vaultPath}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-primary-600 transition-colors bg-white px-3 py-1.5 rounded-lg border border-neutral-200 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Knowledge Vault</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2 rounded-lg bg-white border border-neutral-200 text-neutral-600 hover:text-primary-600 shadow-xs transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Share link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-success-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`p-2 rounded-lg border shadow-xs transition-colors flex items-center gap-1.5 text-xs font-semibold ${
              isBookmarked
                ? 'bg-primary-50 border-primary-300 text-primary-600'
                : 'bg-white border-neutral-200 text-neutral-600 hover:text-primary-600'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-primary-600' : ''}`} />
            <span>{isBookmarked ? 'Saved' : 'Bookmark'}</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={handleDeleteResource}
              className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 shadow-xs transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Delete Resource"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. HERO SHOWCASE CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-950 border border-neutral-800 p-8 sm:p-10 text-white shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-warning-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary-500/20 border border-primary-500/40 text-primary-300">
                {isGithub ? 'Open Source Repo' : category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-neutral-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-success-400" />
                Verified Campus Asset
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {title}
            </h1>

            <p className="text-sm text-neutral-400 leading-relaxed">
              {description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 pt-2">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-primary-400" />
                {file_size}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-warning-400" />
                {download_count} Engagements
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Added {formatRelativeTime(created_at)}
              </span>
            </div>
          </div>

          {/* Quick Action Button Box */}
          <div className="shrink-0 bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md flex flex-col gap-3 min-w-[240px]">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="btn-primary w-full py-3 px-5 text-sm font-bold shadow-lg flex items-center justify-center gap-2"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
            <p className="text-[11px] text-center text-neutral-400">
              {action.subtext}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={handleDeleteResource}
                className="w-full py-2 px-3 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Resource</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. TWO-COLUMN MAIN CONTENT & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Full Curriculum & Architectural Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Overview & Architecture */}
          <div className="voodoo-card p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary-600" />
              <span>Architectural Overview & Purpose</span>
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              This resource is part of the Advanced Tech Club production engineering library. It equips club engineers with production patterns, deployment infrastructure templates, and battle-tested code conventions.
            </p>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Direct Resource Endpoint
              </h3>
              <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-neutral-200">
                <code className="text-xs text-primary-700 font-mono truncate">
                  {file_url}
                </code>
                <a
                  href={file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open ↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* Section: Key Topics / Breakdown */}
          <div className="voodoo-card p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-warning-600" />
              <span>Core Modules & Learning Objectives</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs mb-2">
                  01
                </div>
                <h4 className="text-sm font-bold text-neutral-900 mb-1">Architecture & Pipeline Setup</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Understanding scalable code organization, environment configuration, and containerized dev environments.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-success-100 text-success-700 flex items-center justify-center font-bold text-xs mb-2">
                  02
                </div>
                <h4 className="text-sm font-bold text-neutral-900 mb-1">Production Best Practices</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Rate limiting, security audits, distributed caching, and state synchronization for campus platforms.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-warning-100 text-warning-700 flex items-center justify-center font-bold text-xs mb-2">
                  03
                </div>
                <h4 className="text-sm font-bold text-neutral-900 mb-1">Hands-On Integration</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Step-by-step code walkthrough with runnable snippets, unit tests, and CI/CD verification workflows.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-info-100 text-info-700 flex items-center justify-center font-bold text-xs mb-2">
                  04
                </div>
                <h4 className="text-sm font-bold text-neutral-900 mb-1">Open Source Contribution</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  How to submit PRs, add missing docs, and earn XP towards the campus engineering leaderboard.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dossier & Related Resources */}
        <div className="space-y-6">
          {/* Asset Dossier */}
          <div className="voodoo-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider text-xs border-b border-neutral-100 pb-3">
              Resource Dossier
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Asset Type</span>
                <span className="font-bold text-neutral-900">{isGithub ? 'GitHub Repository' : isArticle ? 'Technical Article' : category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Payload Size</span>
                <span className="font-bold text-neutral-900">{file_size}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Curator</span>
                <span className="font-bold text-primary-600">{author_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">License</span>
                <span className="font-bold text-neutral-900">MIT / Open Access</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Peer Reviews</span>
                <span className="font-bold text-success-600">✓ Verified by ATC Leads</span>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            </div>
          </div>

          {/* Related Vault Resources */}
          {relatedResources.length > 0 && (
            <div className="voodoo-card p-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Related Knowledge Assets
              </h3>
              <div className="space-y-2.5">
                {relatedResources.map((rel) => {
                  const targetRelPath = isPortalPath ? `/portal/resources/${rel.id}` : `/resources/${rel.id}`;
                  return (
                    <Link
                      key={rel.id}
                      to={targetRelPath}
                      className="block p-3 rounded-xl border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all"
                    >
                      <span className="text-[10px] font-bold uppercase text-primary-600 block mb-1">
                        {rel.category}
                      </span>
                      <p className="text-xs font-bold text-neutral-900 leading-snug line-clamp-1">
                        {rel.title}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResourceDetailPage;
