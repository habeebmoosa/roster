import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UpstashRateLimiter } from "./upstash-limiter";
import { startMockUpstashServer, type MockServer } from "./upstash-mock-server";

/**
 * Real HTTP round trip against a mock Upstash REST server — proves the
 * command shapes (INCR / PEXPIRE / PTTL) and response parsing actually match
 * the protocol, not just that the algorithm is right in isolation.
 */
const TOKEN = "test-token";
let mock: MockServer;

beforeAll(async () => {
  mock = await startMockUpstashServer({ token: TOKEN });
});

afterAll(async () => {
  await mock.close();
});

describe("UpstashRateLimiter", () => {
  it("allows requests up to the limit, then blocks", async () => {
    const limiter = new UpstashRateLimiter(mock.url, TOKEN, 3, 60_000);
    const key = `user-${Math.random()}`;

    expect((await limiter.check(key)).allowed).toBe(true);
    expect((await limiter.check(key)).allowed).toBe(true);
    const third = await limiter.check(key);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = await limiter.check(key);
    expect(fourth.allowed).toBe(false);
  });

  it("tracks separate keys independently", async () => {
    const limiter = new UpstashRateLimiter(mock.url, TOKEN, 1, 60_000);
    const a = await limiter.check(`a-${Math.random()}`);
    const b = await limiter.check(`b-${Math.random()}`);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it("resets the window after it expires", async () => {
    const limiter = new UpstashRateLimiter(mock.url, TOKEN, 1, 20);
    const key = `expiring-${Math.random()}`;
    expect((await limiter.check(key)).allowed).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 40));

    expect((await limiter.check(key)).allowed).toBe(true);
  });

  it("rejects an invalid token", async () => {
    const limiter = new UpstashRateLimiter(mock.url, "wrong-token", 5, 60_000);
    await expect(limiter.check(`key-${Math.random()}`)).rejects.toThrow();
  });
});
