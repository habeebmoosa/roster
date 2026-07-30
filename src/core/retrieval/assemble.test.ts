import { describe, expect, it } from "vitest";
import { countTokens } from "@/lib/tokens";
import { assembleContext } from "./assemble";
import type { RankedCandidate } from "./rank-fusion";

/** Build content that tokenizes to at least `minTokens` tokens. */
function contentWithAtLeastTokens(minTokens: number): string {
  let text = "";
  while (countTokens(text) < minTokens) text += "lorem ipsum dolor sit amet consectetur ";
  return text.trim();
}

function candidate(
  id: string,
  minTokens: number,
  kind: "semantic" | "procedural" = "semantic",
): RankedCandidate {
  return {
    id,
    sourceUri: `kb://x/${id}.md`,
    kind,
    content: contentWithAtLeastTokens(minTokens),
    permissions: [],
  };
}

describe("assembleContext", () => {
  it("returns empty output for no candidates", () => {
    const result = assembleContext([], 1000);
    expect(result).toEqual({
      text: "",
      usedChunkIds: [],
      usedSourceUris: [],
      totalTokens: 0,
      truncated: false,
    });
  });

  it("includes every candidate, in order, when they all fit the budget", () => {
    const candidates = [candidate("a", 20), candidate("b", 20), candidate("c", 20)];
    const result = assembleContext(candidates, 1000);
    expect(result.usedChunkIds).toEqual(["a", "b", "c"]);
    expect(result.usedSourceUris).toEqual(["kb://x/a.md", "kb://x/b.md", "kb://x/c.md"]);
    expect(result.truncated).toBe(false);
    expect(result.totalTokens).toBeLessThanOrEqual(1000);
    expect(result.totalTokens).toBeGreaterThan(0);
  });

  it("never exceeds the token budget", () => {
    const candidates = [candidate("a", 100), candidate("b", 100), candidate("c", 100)];
    const result = assembleContext(candidates, 150);
    expect(result.totalTokens).toBeLessThanOrEqual(150);
    expect(result.truncated).toBe(true);
    // Only "a" fits; "b" would push it over, so assembly stops there.
    expect(result.usedChunkIds).toEqual(["a"]);
  });

  it("stops at the first candidate that doesn't fit rather than skipping to a smaller one later", () => {
    const candidates = [candidate("big", 100), candidate("tiny", 2)];
    const result = assembleContext(candidates, 50);
    // "big" doesn't fit in 50 and there's nothing included yet, so it gets
    // truncated and included; "tiny" (which would fit standalone) is never reached.
    expect(result.usedChunkIds).toEqual(["big"]);
    expect(result.truncated).toBe(true);
  });

  it("truncates rather than omits when even the single most relevant candidate exceeds the budget", () => {
    const candidates = [candidate("a", 200)];
    const result = assembleContext(candidates, 20);
    expect(result.usedChunkIds).toEqual(["a"]);
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.totalTokens).toBeLessThanOrEqual(20);
    expect(result.truncated).toBe(true);
  });

  it("never exceeds the budget across a sweep of tight budgets and candidate sizes", () => {
    const candidates = [candidate("a", 50), candidate("b", 30), candidate("c", 15)];
    for (const budget of [0, 1, 5, 10, 15, 22, 40, 60, 90, 130, 500]) {
      const result = assembleContext(candidates, budget);
      expect(result.totalTokens).toBeLessThanOrEqual(budget);
    }
  });

  it("returns nothing for a zero or negative budget", () => {
    const candidates = [candidate("a", 10)];
    expect(assembleContext(candidates, 0)).toEqual({
      text: "",
      usedChunkIds: [],
      usedSourceUris: [],
      totalTokens: 0,
      truncated: true,
    });
  });

  it("labels each chunk with its source instead of dumping raw content", () => {
    const candidates = [candidate("a", 10, "semantic"), candidate("b", 10, "procedural")];
    const result = assembleContext(candidates, 1000);
    expect(result.text).toContain("[Knowledge: kb://x/a.md]");
    expect(result.text).toContain("[Playbook: kb://x/b.md]");
  });

  it("is deterministic for the same input", () => {
    const candidates = [candidate("a", 20), candidate("b", 20)];
    const r1 = assembleContext(candidates, 1000);
    const r2 = assembleContext(candidates, 1000);
    expect(r1).toEqual(r2);
  });
});
