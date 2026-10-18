import React from 'react';
import { Download, FileText, Code2, BookOpen, Map, Trash2, HardDrive } from 'lucide-react';
import { formatRelativeTime } from '@atc/shared/utils/formatters';

export function ResourceCard({
  resource,
  onDownload,
  isAdmin = false,
  onDelete
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
        return <Code2 className="w-5 h-5 text-primary-600" />;
      case 'Cheat Sheets':
        return <FileText className="w-5 h-5 text-warning-600" />;
      case 'Roadmaps':
        return <Map className="w-5 h-5 text-success-600" />;
      case 'Documentation':
        return <BookOpen className="w-5 h-5 text-info-600" />;
      case 'Slides':
      default:
        return <FileText className="w-5 h-5 text-primary-500" />;
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
    <div className="voodoo-card-hover p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200">
            {getCategoryIcon()}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${getCategoryBg()}`}
            >
              {category}
            </span>

            {isAdmin && onDelete && (
              <button
                onClick={() => onDelete(id)}
                title="Delete resource"
                className="p-1 text-neutral-400 hover:text-danger-600 rounded hover:bg-danger-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <h3 className="text-base font-bold text-neutral-900 mb-1.5 leading-snug">
          {title}
        </h3>
        <p className="text-xs text-neutral-500 line-clamp-2 mb-4 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span className="flex items-center gap-1 font-medium text-neutral-600">
            <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
            {file_size}
          </span>
          <span>•</span>
          <span>{download_count} downloads</span>
        </div>

        <button
          onClick={() => onDownload(resource)}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      </div>
    </div>
  );
}

export default ResourceCard;
