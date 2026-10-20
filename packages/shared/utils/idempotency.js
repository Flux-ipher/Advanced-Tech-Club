// packages/shared/utils/idempotency.js
// Advanced Tech Club (ATC) — Idempotency Engine for Web & Mobile
// Prevents duplicate event check-ins, double-awarding of points, and concurrent request collisions.

/**
 * In-memory LRU / TTL Idempotency Cache
 */
class IdempotencyCache {
  constructor(maxSize = 500, defaultTtlMs = 1000 * 60 * 15) { // 15 minutes default TTL
    this.cache = new Map();
    this.inFlight = new Map();
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Deterministic Idempotency Key generator
   * @param {string} scope e.g., 'checkin', 'rsvp', 'award_points'
   * @param {string} userId Member ID / Firebase UID
   * @param {string} resourceId Event ID, Token, or Entity ID
   * @param {string|null} salt Optional extra parameter
   */
  generateKey(scope, userId, resourceId, salt = null) {
    const cleanScope = String(scope || 'action').trim().toLowerCase();
    const cleanUser = String(userId || 'anon').trim();
    const cleanResource = String(resourceId || 'global').trim();
    const cleanSalt = salt ? `:${String(salt).trim()}` : '';
    return `idem:${cleanScope}:${cleanUser}:${cleanResource}${cleanSalt}`;
  }

  /**
   * Check if a key was previously processed
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.payload;
  }

  /**
   * Store a processed result
   */
  set(key, payload, ttlMs = null) {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    const ttl = ttlMs || this.defaultTtlMs;
    this.cache.set(key, {
      payload,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  /**
   * Execute an async operation with single-flight deduplication and idempotency caching
   * @param {string} key Unique idempotency key
   * @param {Function} asyncOperation Async callback that produces the result
   * @param {number|null} ttlMs Cache lifetime
   */
  async execute(key, asyncOperation, ttlMs = null) {
    // 1. Check if already completed and cached
    const cached = this.get(key);
    if (cached !== null) {
      return {
        ...cached,
        isIdempotentReplay: true,
        idempotencyKey: key
      };
    }

    // 2. Check if identical request is currently in-flight (Single-Flight Pattern)
    if (this.inFlight.has(key)) {
      const inFlightPromise = this.inFlight.get(key);
      const res = await inFlightPromise;
      return {
        ...res,
        isIdempotentReplay: true,
        idempotencyKey: key
      };
    }

    // 3. Launch operation and register in in-flight registry
    const operationPromise = (async () => {
      try {
        const result = await asyncOperation();
        this.set(key, result, ttlMs);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, operationPromise);
    return operationPromise;
  }

  clear() {
    this.cache.clear();
    this.inFlight.clear();
  }
}

export const idempotency = new IdempotencyCache();
export default idempotency;
