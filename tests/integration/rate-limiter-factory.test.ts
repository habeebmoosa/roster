import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Exercises `getRateLimiter()`'s branching against the real `env` singleton —
 * unlike the rest of this sub-phase's tests, this needs the full env (DB URL,
 * auth secret, etc.) that only the integration setup loads from `.env`, so it
 * lives here rather than as a unit test.
 *
 * Each case resets the module registry so `@/lib/env`'s own internal cache
 * (set on first property access) and the factory's cached limiter both start
 * fresh — otherwise a stubbed env from one case would leak into the next.
 * The limiter classes are re-imported dynamically alongside the factory (not
 * statically at the top of the file) so `instanceof` checks compare against
 * the same post-reset module instance, not a stale one from before the reset.
 */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getRateLimiter", () => {
  it("defaults to an in-memory limiter when Upstash isn't configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);
    const { getRateLimiter } = await import("@/server/ratelimit");
    const { MemoryRateLimiter } = await import("@/server/ratelimit/memory-limiter");
    expect(getRateLimiter()).toBeInstanceOf(MemoryRateLimiter);
  });

  it("selects the Upstash limiter when both env vars are configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const { getRateLimiter } = await import("@/server/ratelimit");
    const { UpstashRateLimiter } = await import("@/server/ratelimit/upstash-limiter");
    expect(getRateLimiter()).toBeInstanceOf(UpstashRateLimiter);
  });

  it("caches the resolved limiter across calls", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);
    const { getRateLimiter } = await import("@/server/ratelimit");
    expect(getRateLimiter()).toBe(getRateLimiter());
  });
});
