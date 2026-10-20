// packages/shared/utils/rateLimiter.js
// Advanced Tech Club (ATC) — Client-Side & API Rate Limiting Engine
// Includes: Token Bucket (bursts with continuous replenishment) & Sliding Window algorithms.

/**
 * ============================================================================
 * 1. TOKEN BUCKET IMPLEMENTATION
 * ============================================================================
 * Allows burst capacity up to `capacity`, continuously replenishing at `refillRate` tokens/sec.
 */
export class TokenBucket {
  /**
   * @param {number} capacity Maximum burst capacity
   * @param {number} refillRate Tokens added per second
   * @param {number|null} initialTokens Starting tokens (defaults to capacity)
   */
  constructor(capacity = 5, refillRate = 0.5, initialTokens = null) {
    this.capacity = capacity;
    this.refillRate = refillRate; // tokens per second
    this.tokens = initialTokens !== null ? initialTokens : capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Replenishes tokens according to elapsed real time
   */
  refill() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    if (elapsedSeconds > 0) {
      const tokensToAdd = elapsedSeconds * this.refillRate;
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Attempts to consume `count` tokens
   * @param {number} count Number of tokens to consume
   */
  consume(count = 1) {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return {
        allowed: true,
        remaining: Math.floor(this.tokens),
        retryAfterSec: 0,
        retryAfterMs: 0,
        message: null
      };
    }

    const deficit = count - this.tokens;
    const retryAfterMs = Math.ceil((deficit / this.refillRate) * 1000);
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);

    return {
      allowed: false,
      remaining: Math.floor(this.tokens),
      retryAfterSec,
      retryAfterMs,
      message: `Rate limit reached. Token bucket depleted. Please wait ${retryAfterSec}s before retrying.`
    };
  }

  /**
   * Peek available tokens without consumption
   */
  peek() {
    this.refill();
    return Math.floor(this.tokens);
  }
}

/**
 * Token Bucket Registry partitioned by key
 */
export class TokenBucketRateLimiter {
  constructor() {
    this.buckets = new Map();
  }

  getBucket(key, capacity = 5, refillRate = 0.5) {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(capacity, refillRate);
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  consume(key, tokens = 1, capacity = 5, refillRate = 0.5) {
    const bucket = this.getBucket(key, capacity, refillRate);
    return bucket.consume(tokens);
  }

  reset(key) {
    this.buckets.delete(key);
  }

  clear() {
    this.buckets.clear();
  }
}

export const tokenBucketLimiter = new TokenBucketRateLimiter();

/**
 * Token Bucket Presets for ATC Platform Workflows
 */
export const TOKEN_BUCKET_PRESETS = Object.freeze({
  // Event Check-in: capacity 3 burst, refills 1 token every 15s (0.067 tokens/sec)
  CHECK_IN: { capacity: 3, refillRate: 1 / 15, name: 'Check-in validation' },

  // Admin QR Scanner: capacity 2 burst, refills 1 token every 1.5s (0.667 tokens/sec)
  ADMIN_SCANNER: { capacity: 2, refillRate: 1 / 1.5, name: 'Admin camera scanner' },

  // Workshop RSVP: capacity 4 burst, refills 1 token every 10s (0.1 tokens/sec)
  RSVP: { capacity: 4, refillRate: 1 / 10, name: 'RSVP submission' },

  // Gamification points reward: capacity 10 burst, refills 1 token every 5s (0.2 tokens/sec)
  POINTS_REWARD: { capacity: 10, refillRate: 1 / 5, name: 'Points ledger' }
});

/**
 * Check and consume tokens from a preset token bucket
 */
export function checkTokenBucket(presetKey, identifier, tokens = 1) {
  const preset = TOKEN_BUCKET_PRESETS[presetKey];
  if (!preset) {
    return { allowed: true, remaining: 99, retryAfterSec: 0, retryAfterMs: 0, message: null };
  }
  const bucketKey = `tb:${presetKey}:${String(identifier || 'anon').trim()}`;
  return tokenBucketLimiter.consume(bucketKey, tokens, preset.capacity, preset.refillRate);
}

/**
 * ============================================================================
 * 2. SLIDING WINDOW RATE LIMITER
 * ============================================================================
 */
class SlidingWindowRateLimiter {
  constructor() {
    this.hits = new Map();
  }

  check(key, maxRequests = 5, windowMs = 60000) {
    const now = Date.now();
    const timestamps = this.hits.get(key) || [];
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= maxRequests) {
      const oldestValid = validTimestamps[0];
      const retryAfterMs = Math.max(0, oldestValid + windowMs - now);
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);

      this.hits.set(key, validTimestamps);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
        retryAfterSec,
        message: `Too many attempts. Please slow down and try again in ${retryAfterSec}s.`
      };
    }

    validTimestamps.push(now);
    this.hits.set(key, validTimestamps);

    return {
      allowed: true,
      remaining: maxRequests - validTimestamps.length,
      retryAfterMs: 0,
      retryAfterSec: 0,
      message: null
    };
  }

  reset(key) {
    this.hits.delete(key);
  }

  clear() {
    this.hits.clear();
  }
}

export const rateLimiter = new SlidingWindowRateLimiter();

export const RATE_LIMIT_PRESETS = Object.freeze({
  CHECK_IN_ATTEMPT: { max: 4, windowMs: 60000, name: 'Check-in validation' },
  ADMIN_QR_SCANNER: { max: 1, windowMs: 1200, name: 'Camera scanner' },
  RSVP_ACTION: { max: 6, windowMs: 60000, name: 'RSVP actions' },
  POINTS_ACTION: { max: 10, windowMs: 60000, name: 'Points activities' }
});

export function checkPresetLimit(presetKey, identifier) {
  const preset = RATE_LIMIT_PRESETS[presetKey];
  if (!preset) {
    return { allowed: true, remaining: 99, retryAfterSec: 0 };
  }
  const bucketKey = `${presetKey}:${String(identifier || 'anon').trim()}`;
  return rateLimiter.check(bucketKey, preset.max, preset.windowMs);
}

/**
 * ============================================================================
 * 3. RELOAD CIRCUIT BREAKER (Guards against rapid F5 / refresh loops)
 * ============================================================================
 */
export function checkReloadCircuitBreaker(maxReloads = 10, windowMs = 10000) {
  if (typeof window === 'undefined') return { allowed: true, isTripped: false };

  try {
    const storageKey = 'atc_reload_circuit_timestamps';
    const now = Date.now();
    const raw = window.sessionStorage ? window.sessionStorage.getItem(storageKey) : null;
    const history = raw ? JSON.parse(raw) : [];

    // Filter to reloads in the last windowMs
    const recent = history.filter((t) => now - t < windowMs);

    if (recent.length >= maxReloads) {
      const oldest = recent[0];
      const cooldownMs = Math.max(0, oldest + windowMs - now);
      const cooldownSec = Math.ceil(cooldownMs / 1000);

      return {
        allowed: false,
        isTripped: true,
        cooldownMs,
        cooldownSec,
        message: `High reload frequency detected (${recent.length} reloads in ${Math.round(windowMs / 1000)}s). Serving local cached state for ${cooldownSec}s.`
      };
    }

    recent.push(now);
    if (window.sessionStorage) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(recent));
    }
    return { allowed: true, isTripped: false, remaining: maxReloads - recent.length };
  } catch (err) {
    return { allowed: true, isTripped: false };
  }
}

/**
 * ============================================================================
 * 4. BUTTON CLICK SPAM GUARD (Rage-click & double-tap defense)
 * ============================================================================
 * Drops rapid microsecond clicks within a debounce/cooldown window.
 */
export function createClickSpamGuard(cooldownMs = 600) {
  let lastClickTime = 0;
  let isExecuting = false;

  return async (callback) => {
    const now = Date.now();
    if (now - lastClickTime < cooldownMs || isExecuting) {
      // Discard duplicate click
      return { executed: false, dropped: true };
    }
    lastClickTime = now;
    isExecuting = true;
    try {
      if (typeof callback === 'function') {
        const result = await callback();
        return { executed: true, dropped: false, result };
      }
      return { executed: true, dropped: false };
    } finally {
      isExecuting = false;
    }
  };
}

export default rateLimiter;

