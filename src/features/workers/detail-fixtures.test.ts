import { describe, expect, it } from "vitest";
import { detailFixturesForAgent } from "./detail-fixtures";

describe("detailFixturesForAgent", () => {
  it("is deterministic for the same agent id", () => {
    expect(detailFixturesForAgent("customer-support")).toEqual(
      detailFixturesForAgent("customer-support"),
    );
  });

  it("produces plausible ranges", () => {
    const fixtures = detailFixturesForAgent("customer-support");
    expect(fixtures.status).toBe("Active");
    expect(fixtures.conversations30d).toBeGreaterThan(0);
    expect(fixtures.spend30dUsd).toBeGreaterThan(0);
    expect(fixtures.uptimePct).toBeGreaterThanOrEqual(99);
    expect(fixtures.uptimePct).toBeLessThan(100);
    expect(fixtures.tokens30dLabel).toMatch(/^\d+\.\dM$/);
    expect(fixtures.recentActivity).toHaveLength(3);
  });

  it("never repeats the same activity template across the three entries", () => {
    // Regression check: a prior bit-shift selection could land all three on
    // the same template for some hashes, showing identical activity 3x.
    for (const id of ["customer-support", "content-writer", "research-analyst", "x", "abc123"]) {
      const texts = detailFixturesForAgent(id).recentActivity.map((a) => a.text);
      expect(new Set(texts).size).toBe(3);
    }
  });

  it("gives different agents different (but still deterministic) values", () => {
    const a = detailFixturesForAgent("customer-support");
    const b = detailFixturesForAgent("content-writer");
    // Not guaranteed to differ on every field, but the whole object should
    // not be identical for two different ids in practice.
    expect(a).not.toEqual(b);
  });
});
