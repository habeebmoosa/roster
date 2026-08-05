import { describe, expect, it } from "vitest";
import { formatTokenCount } from "./format-tokens";

describe("formatTokenCount", () => {
  it("shows small counts as-is", () => {
    expect(formatTokenCount(0)).toBe("0");
    expect(formatTokenCount(842)).toBe("842");
  });

  it("abbreviates thousands with one decimal, dropping a trailing .0", () => {
    expect(formatTokenCount(12345)).toBe("12.3K");
    expect(formatTokenCount(5000)).toBe("5K");
  });

  it("abbreviates millions with one decimal, dropping a trailing .0", () => {
    expect(formatTokenCount(1_234_567)).toBe("1.2M");
    expect(formatTokenCount(3_000_000)).toBe("3M");
  });
});
