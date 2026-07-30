import { describe, expect, it } from "vitest";
import { hashString } from "./hash";

describe("hashString", () => {
  it("is deterministic for the same input", () => {
    expect(hashString("customer-support")).toBe(hashString("customer-support"));
  });

  it("differs for different inputs (in practice)", () => {
    expect(hashString("customer-support")).not.toBe(hashString("content-writer"));
  });

  it("always returns a non-negative integer", () => {
    for (const input of ["", "a", "customer-support", "🎉", "x".repeat(500)]) {
      const result = hashString(input);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
    }
  });
});
