import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { rerankCandidates } from "./rerank";
import type { RankedCandidate } from "./rank-fusion";

function candidate(id: string): RankedCandidate {
  return {
    id,
    sourceUri: `kb://x/${id}.md`,
    kind: "semantic",
    content: `content ${id}`,
    permissions: [],
  };
}

const MOCK_FINISH_REASON = { unified: "stop" as const, raw: undefined };
const MOCK_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function mockModel(object: unknown): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: JSON.stringify(object) }],
      finishReason: MOCK_FINISH_REASON,
      usage: MOCK_USAGE,
      warnings: [],
    },
  });
}

describe("rerankCandidates", () => {
  it("returns an empty list without calling the model when there are no candidates", async () => {
    const model = mockModel({ rankedIds: [] });
    const result = await rerankCandidates({ query: "q", candidates: [], model });
    expect(result).toEqual([]);
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("orders candidates per the model's rankedIds", async () => {
    const candidates = [candidate("a"), candidate("b"), candidate("c")];
    const model = mockModel({ rankedIds: ["c", "a"] });
    const result = await rerankCandidates({ query: "q", candidates, model });
    expect(result.map((c) => c.id)).toEqual(["c", "a"]);
  });

  it("truncates to `keep`", async () => {
    const candidates = [candidate("a"), candidate("b"), candidate("c")];
    const model = mockModel({ rankedIds: ["a", "b", "c"] });
    const result = await rerankCandidates({ query: "q", candidates, model, keep: 2 });
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("defaults to keeping 5", async () => {
    const candidates = Array.from({ length: 8 }, (_, i) => candidate(`c${i}`));
    const model = mockModel({ rankedIds: candidates.map((c) => c.id) });
    const result = await rerankCandidates({ query: "q", candidates, model });
    expect(result).toHaveLength(5);
  });

  it("silently drops an id the model returns that isn't a real candidate", async () => {
    const candidates = [candidate("a"), candidate("b")];
    const model = mockModel({ rankedIds: ["a", "not-a-real-id", "b"] });
    const result = await rerankCandidates({ query: "q", candidates, model });
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("falls back to the original (hybrid-search) order if the model call fails", async () => {
    const candidates = [candidate("a"), candidate("b"), candidate("c")];
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("provider exploded");
      },
    });
    const result = await rerankCandidates({ query: "q", candidates, model, keep: 2 });
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("falls back to the original order if the model returns invalid structured output", async () => {
    const candidates = [candidate("a"), candidate("b")];
    const model = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: "text", text: "not valid json at all" }],
        finishReason: MOCK_FINISH_REASON,
        usage: MOCK_USAGE,
        warnings: [],
      },
    });
    const result = await rerankCandidates({ query: "q", candidates, model });
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("sends the query and candidate content in the prompt", async () => {
    const candidates = [candidate("a")];
    const model = mockModel({ rankedIds: ["a"] });
    await rerankCandidates({ query: "what is the refund window", candidates, model });
    const call = model.doGenerateCalls[0]!;
    const promptText = JSON.stringify(call.prompt);
    expect(promptText).toContain("what is the refund window");
    expect(promptText).toContain("content a");
  });
});
