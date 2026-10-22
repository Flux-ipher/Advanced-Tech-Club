import React from 'react';

export function RoleBadge({ role, size = 'sm' }) {
  const getBadgeStyle = () => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return 'bg-primary-50 text-primary-700 border-primary-200';
      case 'media_head':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'member':
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const getLabel = () => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return 'Admin';
      case 'media_head':
        return 'Media Head';
      case 'member':
      default:
        return 'Member';
    }
  };

  const sizeClasses = size === 'xs' 
    ? 'text-[10px] px-1.5 py-0.5' 
    : size === 'lg'
    ? 'text-sm px-3 py-1 font-semibold'
    : 'text-xs px-2 py-0.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border uppercase tracking-wider font-semibold ${sizeClasses} ${getBadgeStyle()}`}
    >
      {getLabel()}
    </span>
  );
}

export default RoleBadge;
