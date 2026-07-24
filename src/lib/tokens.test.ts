import { describe, expect, it } from "vitest";
import { countTokens } from "./tokens";

describe("countTokens", () => {
  it("returns 0 for empty input", () => {
    expect(countTokens("")).toBe(0);
  });

  it("counts more tokens for longer text", () => {
    const short = countTokens("Hello world.");
    const long = countTokens("Hello world. ".repeat(20));
    expect(long).toBeGreaterThan(short);
  });

  it("is deterministic for the same input", () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    expect(countTokens(text)).toBe(countTokens(text));
  });
});
