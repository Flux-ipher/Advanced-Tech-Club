import { useState, useEffect } from 'react';
import { APP_RELEASE } from '../utils/appConfig.js';

let cachedApkSize = null;
let cachedApkSizeDetailed = null;

/**
 * Custom hook to dynamically inspect the live APK binary via HEAD request,
 * falling back to centralized APP_RELEASE metadata.
 */
export function useApkMetadata() {
  const [sizeShort, setSizeShort] = useState(cachedApkSize || APP_RELEASE.sizeShort);
  const [sizeDetailed, setSizeDetailed] = useState(cachedApkSizeDetailed || APP_RELEASE.size);

  useEffect(() => {
    if (cachedApkSize && cachedApkSizeDetailed) {
      setSizeShort(cachedApkSize);
      setSizeDetailed(cachedApkSizeDetailed);
      return;
    }

    // On production (advclub.online), /atc-release.apk redirects to GitHub CDN which blocks client-side CORS HEAD requests.
    // Use the verified APP_RELEASE metadata directly to avoid browser console errors.
    if (typeof window !== 'undefined' && window.location.hostname.includes('advclub.online')) {
      cachedApkSize = APP_RELEASE.sizeShort;
      cachedApkSizeDetailed = APP_RELEASE.size;
      return;
    }

    let isMounted = true;
    fetch(APP_RELEASE.downloadUrl, { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) return;
        const contentLength = res.headers.get('content-length');
        if (contentLength && isMounted) {
          const bytes = parseInt(contentLength, 10);
          if (!isNaN(bytes) && bytes > 0) {
            // Decimal MB formatting (e.g., 88.35 MB)
            const mbDecimal = (bytes / 1000000).toFixed(2);
            // Integer short formatting (e.g., 88MB)
            const mbShort = `${Math.round(bytes / 1000000)}MB`;
            
            cachedApkSize = mbShort;
            cachedApkSizeDetailed = `${mbDecimal} MB`;

            setSizeShort(mbShort);
            setSizeDetailed(`${mbDecimal} MB`);
          }
        }
      })
      .catch(() => {
        // Fallback gracefully to predefined metadata
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    ...APP_RELEASE,
    size: sizeDetailed,
    sizeShort,
  };
}
