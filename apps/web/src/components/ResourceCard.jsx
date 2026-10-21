import React from 'react';
import {
  FilePdf,
  FileDoc,
  FilePpt,
  FileCode,
  FileText,
  BookmarkSimple,
  DownloadSimple,
  Trash,
  Eye,
  HardDrive
} from '@phosphor-icons/react';
import { formatRelativeTime } from '@atc/shared/utils/formatters';

export function ResourceCard({
  resource,
  onDownload,
  isAdmin = false,
  onDelete,
  onPreview,
  isBookmarked = false,
  onToggleBookmark
}) {
  const {
    id,
    title,
    description,
    file_url,
    file_size = '1.2 MB',
    category = 'Slides',
    download_count = 0,
    created_at,
    author_name
  } = resource;

  const getCategoryIcon = () => {
    switch (category) {
      case 'Code Samples':
        return <FileCode size={20} weight="duotone" className="text-primary-600" />;
      case 'Cheat Sheets':
        return <FileText size={20} weight="duotone" className="text-warning-600" />;
      case 'Roadmaps':
        return <FileDoc size={20} weight="duotone" className="text-success-600" />;
      case 'Documentation':
        return <FilePdf size={20} weight="duotone" className="text-info-600" />;
      case 'Slides':
      default:
        return <FilePpt size={20} weight="duotone" className="text-primary-500" />;
    }
  };

  const getCategoryBg = () => {
    switch (category) {
      case 'Code Samples':
        return 'bg-primary-50 text-primary-700 border-primary-200';
      case 'Cheat Sheets':
        return 'bg-warning-50 text-warning-700 border-warning-200';
      case 'Roadmaps':
        return 'bg-success-50 text-success-700 border-success-200';
      case 'Documentation':
        return 'bg-info-50 text-info-700 border-info-200';
      case 'Slides':
      default:
        return 'bg-primary-50 text-primary-700 border-primary-200';
    }
  };

  return (
    <div
      onClick={() => onPreview && onPreview(resource)}
      className="voodoo-card-hover p-5 flex flex-col justify-between cursor-pointer group transition-all duration-200"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 group-hover:border-primary-300 group-hover:bg-primary-50/50 transition-colors">
            {getCategoryIcon()}
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${getCategoryBg()}`}
            >
              {category}
            </span>

            {onToggleBookmark && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(id);
                }}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark resource'}
                className={`p-1.5 rounded-lg border transition-all ${
                  isBookmarked
                    ? 'bg-primary-50 border-primary-300 text-primary-600'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-400 hover:text-primary-600 hover:bg-primary-50'
                }`}
              >
                <BookmarkSimple size={16} weight={isBookmarked ? 'fill' : 'regular'} className={isBookmarked ? 'text-primary-600' : ''} />
              </button>
            )}

            {isAdmin && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                title="Delete resource"
                className="p-1.5 text-neutral-400 hover:text-danger-600 rounded-lg hover:bg-danger-50 transition-colors"
              >
                <Trash size={15} weight="regular" />
              </button>
            )}
          </div>
        </div>

        <h3 className="text-base font-bold text-neutral-900 mb-1.5 leading-snug group-hover:text-primary-600 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-neutral-500 line-clamp-2 mb-4 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="flex items-center gap-1 font-medium text-neutral-600">
            <HardDrive size={14} weight="regular" className="text-neutral-400" />
            {file_size}
          </span>
          <span>•</span>
          <span>{download_count} downloads</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onPreview) onPreview(resource);
            }}
            className="p-1.5 text-neutral-500 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            title="Preview resource"
          >
            <Eye size={16} weight="regular" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(resource);
            }}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
          >
            <DownloadSimple size={14} weight="bold" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResourceCard;
