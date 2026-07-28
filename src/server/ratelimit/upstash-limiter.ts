import { Redis } from "@upstash/redis";
import type { RateLimitResult, RateLimiter } from "./types";

/**
 * Same fixed-window algorithm as `MemoryRateLimiter`, shared across instances
 * via Upstash's REST Redis. Built by hand against `@upstash/redis`'s basic
 * INCR/PEXPIRE/PTTL commands rather than adding `@upstash/ratelimit` as a
 * second dependency, so both implementations behave identically.
 */
export class UpstashRateLimiter implements RateLimiter {
  private readonly redis: Redis;

  constructor(
    url: string,
    token: string,
    private readonly limit: number,
    private readonly windowMs: number,
  ) {
    this.redis = new Redis({ url, token });
  }

  async check(key: string): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;
    const count = await this.redis.incr(redisKey);
    if (count === 1) {
      await this.redis.pexpire(redisKey, this.windowMs);
    }
    const ttl = await this.redis.pttl(redisKey);

    return {
      allowed: count <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - count),
      resetAt: new Date(Date.now() + Math.max(0, ttl)),
    };
  }
}
