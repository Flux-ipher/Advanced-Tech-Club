// packages/shared/utils/debounce.js
// Advanced Tech Club (ATC) — Client-side Debounce & Anti-Spam Utility
// Debounces rapid button taps (RSVP, form submit, reactions) before hitting network

import { useRef, useCallback } from 'react';

/**
 * Standard debounce utility function
 * @param {Function} fn Function to execute after cooldown
 * @param {number} delay Milliseconds cooldown window
 */
export function debounce(fn, delay = 500) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * React useDebounce hook for debouncing fast user interactions
 * @param {Function} fn Callback function
 * @param {number} delay Milliseconds debounce delay (default 500ms)
 */
export function useDebounce(fn, delay = 500) {
  const timer = useRef(null);

  return useCallback(
    (...args) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => {
        fn(...args);
      }, delay);
    },
    [fn, delay]
  );
}

export default useDebounce;
