import { env } from "@/lib/env";
import { MemoryRateLimiter } from "./memory-limiter";
import { UpstashRateLimiter } from "./upstash-limiter";
import type { RateLimiter } from "./types";

export type { RateLimiter, RateLimitResult } from "./types";

const DEFAULT_LIMIT = 60; // requests
const DEFAULT_WINDOW_MS = 60_000; // per minute

let cached: RateLimiter | undefined;

/**
 * Upstash-backed when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are
 * configured (shared across instances), in-memory otherwise. Resolved once
 * and cached for the process lifetime.
 */
export function getRateLimiter(): RateLimiter {
  if (cached) return cached;
  cached =
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? new UpstashRateLimiter(
          env.UPSTASH_REDIS_REST_URL,
          env.UPSTASH_REDIS_REST_TOKEN,
          DEFAULT_LIMIT,
          DEFAULT_WINDOW_MS,
        )
      : new MemoryRateLimiter(DEFAULT_LIMIT, DEFAULT_WINDOW_MS);
  return cached;
}
