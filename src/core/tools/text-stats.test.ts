import { describe, expect, it } from "vitest";
import { computeTextStats, countTextStats } from "./text-stats";
import { callTool } from "./test-helpers";

describe("computeTextStats", () => {
  it("counts words, characters, and sentences", () => {
    const stats = computeTextStats("Hello world. How are you today?");
    expect(stats.wordCount).toBe(6);
    expect(stats.characterCount).toBe(31);
    expect(stats.sentenceCount).toBe(2);
  });

  it("estimates at least one minute of reading time even for short text", () => {
    const stats = computeTextStats("Hi.");
    expect(stats.readingTimeMinutes).toBe(1);
  });

  it("scales reading time with word count", () => {
    const longText = Array.from({ length: 800 }, () => "word").join(" ");
    const stats = computeTextStats(longText);
    expect(stats.wordCount).toBe(800);
    expect(stats.readingTimeMinutes).toBe(4);
  });

  it("handles empty text", () => {
    const stats = computeTextStats("");
    expect(stats.wordCount).toBe(0);
    expect(stats.sentenceCount).toBe(0);
    expect(stats.readingTimeMinutes).toBe(1);
  });

  it("counts characters excluding whitespace separately", () => {
    const stats = computeTextStats("a b c");
    expect(stats.characterCount).toBe(5);
    expect(stats.characterCountNoSpaces).toBe(3);
  });
});

describe("countTextStats tool", () => {
  it("returns stats via the tool's execute function", async () => {
    const result = await callTool(countTextStats, { text: "Hello world." });
    expect(result.wordCount).toBe(2);
  });
});
