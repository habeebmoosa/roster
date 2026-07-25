import { describe, expect, it } from "vitest";
import { countTokens, truncateToTokenBudget } from "./tokens";

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

describe("truncateToTokenBudget", () => {
  const LONG_TEXT = "lorem ipsum dolor sit amet consectetur ".repeat(50).trim();

  it("returns the text unchanged when it already fits", () => {
    expect(truncateToTokenBudget("short text", 1000)).toBe("short text");
  });

  it("returns empty string for a zero or negative budget", () => {
    expect(truncateToTokenBudget(LONG_TEXT, 0)).toBe("");
    expect(truncateToTokenBudget(LONG_TEXT, -5)).toBe("");
  });

  it("never returns more tokens than the budget, across a sweep of tight budgets", () => {
    for (const budget of [1, 2, 5, 10, 20, 50, 100]) {
      const result = truncateToTokenBudget(LONG_TEXT, budget);
      expect(countTokens(result)).toBeLessThanOrEqual(budget);
    }
  });

  it("appends an ellipsis when truncation actually occurs", () => {
    const result = truncateToTokenBudget(LONG_TEXT, 10);
    expect(result.length).toBeGreaterThan(0);
    expect(result.endsWith("…")).toBe(true);
  });

  it("is deterministic for the same input", () => {
    expect(truncateToTokenBudget(LONG_TEXT, 15)).toBe(truncateToTokenBudget(LONG_TEXT, 15));
  });
});
