import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "./memory-limiter";

describe("MemoryRateLimiter", () => {
  it("allows requests up to the limit, then blocks", async () => {
    const limiter = new MemoryRateLimiter(3, 60_000);
    const results = await Promise.all([
      limiter.check("user-a"),
      limiter.check("user-a"),
      limiter.check("user-a"),
    ]);
    expect(results.map((r) => r.allowed)).toEqual([true, true, true]);
    expect(results[2]!.remaining).toBe(0);

    const fourth = await limiter.check("user-a");
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it("tracks separate keys independently", async () => {
    const limiter = new MemoryRateLimiter(1, 60_000);
    const a = await limiter.check("user-a");
    const b = await limiter.check("user-b");
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it("resets the window after it expires", async () => {
    const limiter = new MemoryRateLimiter(1, 10);
    const first = await limiter.check("user-a");
    expect(first.allowed).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const second = await limiter.check("user-a");
    expect(second.allowed).toBe(true);
  });

  it("reports a resetAt in the future", async () => {
    const limiter = new MemoryRateLimiter(5, 60_000);
    const before = Date.now();
    const result = await limiter.check("user-a");
    expect(result.resetAt.getTime()).toBeGreaterThan(before);
  });

  it("reports the configured limit on every result", async () => {
    const limiter = new MemoryRateLimiter(2, 60_000);
    const first = await limiter.check("user-a");
    const second = await limiter.check("user-a");
    expect(first.limit).toBe(2);
    expect(second.limit).toBe(2);
  });
});
