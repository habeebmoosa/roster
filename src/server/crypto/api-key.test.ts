import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey } from "./api-key";

describe("api-key", () => {
  it("generates a raw key with the expected prefix and a matching hash", () => {
    const { rawKey, keyPrefix, hashedKey } = generateApiKey();
    expect(rawKey.startsWith("rk_live_")).toBe(true);
    expect(rawKey.startsWith(keyPrefix)).toBe(true);
    expect(keyPrefix.length).toBeLessThan(rawKey.length);
    expect(hashedKey).toBe(hashApiKey(rawKey));
  });

  it("generates unique raw keys each call", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.rawKey).not.toBe(b.rawKey);
    expect(a.hashedKey).not.toBe(b.hashedKey);
  });

  it("hashes deterministically", () => {
    const { rawKey } = generateApiKey();
    expect(hashApiKey(rawKey)).toBe(hashApiKey(rawKey));
  });

  it("never stores the raw key in the hash", () => {
    const { rawKey, hashedKey } = generateApiKey();
    expect(hashedKey).not.toContain(rawKey);
  });
});
