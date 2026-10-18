// Formatting helpers for dates, times, file sizes, role labels

export function formatDate(dateString, options = {}) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  };
  return date.toLocaleDateString('en-US', defaultOptions);
}

export function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateString);
}

export function formatRole(role) {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return 'Admin';
    case 'member':
    default:
      return 'Member';
  }
}

export function getRoleColor(role) {
  switch (role) {
    case 'super_admin':
      return {
        bg: '#eff6ff',
        text: '#0597ff',
        border: '#c1e5ff'
      };
    case 'admin':
      return {
        bg: '#fdf8f2',
        text: '#ff9b05',
        border: '#f9e1be'
      };
    case 'member':
    default:
      return {
        bg: '#f7f7f8',
        text: '#51585c',
        border: '#dadcdd'
      };
  }
}

export function formatFileSize(bytes) {
  if (typeof bytes === 'string') return bytes;
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
