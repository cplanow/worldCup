/**
 * In-process sliding-window rate limiter.
 *
 * Keyed by an arbitrary string (IP, username, user ID). Intended for auth
 * endpoints as defense in depth. Single-container deploys on sparta are the
 * target — state lives in a module-level Map and resets on process restart.
 *
 * Not suitable for multi-replica deploys; swap for Redis/Turso-backed storage
 * if we ever scale horizontally.
 */
import { headers } from "next/headers";

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Periodic pruning to stop the Map from growing unbounded. Runs lazily on
// checkRateLimit calls when the bucket count crosses this threshold.
const MAX_BUCKETS_BEFORE_PRUNE = 1024;
// Longest window any caller configures — buckets older than this can be
// pruned regardless of config because no limiter would ever consult them.
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check whether `key` has exceeded `config.max` attempts within
 * `config.windowMs`. On allow, records the attempt timestamp.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  now: number = Date.now()
): RateLimitResult {
  maybePrune(now);

  const bucket = buckets.get(key) ?? { timestamps: [] };
  const windowStart = now - config.windowMs;

  // Drop timestamps outside the current window.
  const live = bucket.timestamps.filter((t) => t > windowStart);

  if (live.length >= config.max) {
    // Oldest in-window timestamp dictates when the next slot opens up.
    const oldest = live[0];
    const retryAfterMs = Math.max(0, oldest + config.windowMs - now);
    // Persist the pruned list so we don't re-filter the same expired entries.
    bucket.timestamps = live;
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  live.push(now);
  bucket.timestamps = live;
  buckets.set(key, bucket);

  return {
    allowed: true,
    remaining: config.max - live.length,
    retryAfterMs: 0,
  };
}

/**
 * Test helper. Clears all buckets. Not exported from public API barrels.
 */
export function __resetRateLimitForTests() {
  buckets.clear();
}

function maybePrune(now: number) {
  if (buckets.size < MAX_BUCKETS_BEFORE_PRUNE) return;
  const cutoff = now - MAX_WINDOW_MS;
  for (const [key, bucket] of buckets) {
    const live = bucket.timestamps.filter((t) => t > cutoff);
    if (live.length === 0) {
      buckets.delete(key);
    } else {
      bucket.timestamps = live;
    }
  }
}

/**
 * Best-effort client IP from request headers. Caddy on sparta forwards the
 * original IP via X-Forwarded-For. Falls back to a sentinel in dev/tests so
 * the limiter still runs but is trivially bypassable (intentional — we don't
 * want to lock out a local developer).
 */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    if (xff) {
      // XFF can be "client, proxy1, proxy2" — take the leftmost entry.
      const first = xff.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = h.get("x-real-ip");
    if (realIp) return realIp.trim();
  } catch {
    // headers() throws outside a request scope (tests, module init).
  }
  return "unknown";
}

// Shared configs for the auth endpoints — keep them here so the limits are
// visible in one place and easy to tune.
export const AUTH_LIMITS = {
  registerPerIp: { max: 5, windowMs: 60 * 60 * 1000 }, // 5/hour
  loginPerIp: { max: 10, windowMs: 10 * 60 * 1000 }, // 10/10min
  loginPerUsername: { max: 5, windowMs: 15 * 60 * 1000 }, // 5/15min
  requestResetPerIp: { max: 3, windowMs: 60 * 60 * 1000 }, // 3/hour
  consumeResetPerIp: { max: 10, windowMs: 60 * 60 * 1000 }, // 10/hour
  changePasswordPerUser: { max: 5, windowMs: 60 * 60 * 1000 }, // 5/hour
} as const;
