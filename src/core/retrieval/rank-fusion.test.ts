import { describe, expect, it } from "vitest";
import { reciprocalRankFusion, type RankedCandidate } from "./rank-fusion";

function candidate(id: string): RankedCandidate {
  return {
    id,
    sourceUri: `kb://x/${id}.md`,
    kind: "semantic",
    content: `content ${id}`,
    permissions: [],
  };
}

describe("reciprocalRankFusion", () => {
  it("returns an empty list when given no candidates", () => {
    expect(reciprocalRankFusion([[], []], 10)).toEqual([]);
  });

  it("preserves rank order for a single list, truncated to the limit", () => {
    const list = [candidate("a"), candidate("b"), candidate("c")];
    const result = reciprocalRankFusion([list], 2);
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("deduplicates a candidate that appears in more than one list", () => {
    const listA = [candidate("a"), candidate("b")];
    const listB = [candidate("b"), candidate("c")];
    const result = reciprocalRankFusion([listA, listB], 10);
    const ids = result.map((c) => c.id);
    expect(ids).toHaveLength(new Set(ids).size); // no duplicates
    expect(ids).toContain("b");
  });

  it("ranks a candidate present in both lists above one present in only one", () => {
    // "b" is #2 in both lists; "a" is #1 in only list A. b's fused score
    // (two contributions) should out-rank a plain single-list #1 if a is
    // otherwise absent from list B entirely.
    const listA = [candidate("b"), candidate("a")];
    const listB = [candidate("b"), candidate("z")];
    const result = reciprocalRankFusion([listA, listB], 10);
    expect(result[0]!.id).toBe("b");
  });

  it("respects the limit across merged lists", () => {
    const listA = [candidate("a"), candidate("b"), candidate("c")];
    const listB = [candidate("d"), candidate("e"), candidate("f")];
    const result = reciprocalRankFusion([listA, listB], 4);
    expect(result).toHaveLength(4);
  });

  it("is deterministic for the same input", () => {
    const listA = [candidate("a"), candidate("b")];
    const listB = [candidate("b"), candidate("c")];
    const r1 = reciprocalRankFusion([listA, listB], 10).map((c) => c.id);
    const r2 = reciprocalRankFusion([listA, listB], 10).map((c) => c.id);
    expect(r1).toEqual(r2);
  });
});
