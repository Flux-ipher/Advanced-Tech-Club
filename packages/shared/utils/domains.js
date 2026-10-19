// packages/shared/utils/domains.js
// Multi-domain and subdomain routing utility for ATC Platform
// Supports: advclub.online (Public Site) and portal.advclub.online (Member Portal)

/**
 * Checks whether the current session is being accessed on the portal subdomain
 * (e.g. portal.advclub.online, portal.localhost, or local test query ?portal_mode=true)
 */
export function isPortalSubdomain() {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase();

  return (
    hostname === 'portal.advclub.online' ||
    hostname.startsWith('portal.') ||
    window.location.search.includes('portal_mode=true')
  );
}

/**
 * Returns the URL for the main public site (advclub.online)
 * Automatically adapts between production domains and local dev
 */
export function getPublicSiteUrl(path = '/') {
  if (typeof window === 'undefined') return path;
  const hostname = window.location.hostname.toLowerCase();

  if (hostname.includes('advclub.online')) {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `https://advclub.online${cleanPath}`;
  }

  // Local development fallback
  return path;
}

/**
 * Returns the URL for the member portal (portal.advclub.online)
 * Automatically adapts between production domains and local dev
 */
export function getPortalSiteUrl(path = '/') {
  if (typeof window === 'undefined') return path;
  const hostname = window.location.hostname.toLowerCase();

  if (hostname.includes('advclub.online')) {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    // On the portal domain, paths are root-relative (e.g. /events, not /portal/events)
    return `https://portal.advclub.online${cleanPath === '/portal' ? '/' : cleanPath.replace(/^\/portal/, '') || '/'}`;
  }

  // Local development fallback
  return path.startsWith('/portal') ? path : `/portal${path.startsWith('/') ? path : '/' + path}`;
}
