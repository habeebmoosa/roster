import type { RateLimitResult, RateLimiter } from "./types";

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window limiter backed by an in-process Map. Process-local (doesn't
 * share state across instances) and resets on restart — the default when
 * Upstash isn't configured, and what every offline test runs against.
 */
export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + this.windowMs };
      this.windows.set(key, window);
    }
    window.count += 1;

    return {
      allowed: window.count <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - window.count),
      resetAt: new Date(window.resetAt),
    };
  }
}
