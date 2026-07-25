import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { countTokens } from "@/lib/tokens";
import { compressStepOutput } from "./compress";

const MOCK_FINISH_REASON = { unified: "stop" as const, raw: undefined };
const MOCK_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function mockModel(replyText: string): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: replyText }],
      finishReason: MOCK_FINISH_REASON,
      usage: MOCK_USAGE,
      warnings: [],
    },
  });
}

/** Build text that tokenizes to at least `minTokens` tokens. */
function textWithAtLeastTokens(minTokens: number): string {
  let text = "";
  while (countTokens(text) < minTokens) text += "lorem ipsum dolor sit amet consectetur ";
  return text.trim();
}

describe("compressStepOutput", () => {
  it("passes output through unchanged when it already fits the budget", async () => {
    const result = await compressStepOutput({ output: "short output", budgetTokens: 1000 });
    expect(result).toEqual({ text: "short output", compressed: false, method: "none" });
  });

  it("mechanically truncates a mild overage without calling a model, even if one is supplied", async () => {
    const output = textWithAtLeastTokens(30);
    const model = mockModel("should not be used");

    const result = await compressStepOutput({ output, budgetTokens: 20, model });

    expect(result.method).toBe("truncate");
    expect(result.compressed).toBe(true);
    expect(countTokens(result.text)).toBeLessThanOrEqual(20);
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("truncates a large overage too when no model is supplied", async () => {
    const output = textWithAtLeastTokens(200);
    const result = await compressStepOutput({ output, budgetTokens: 10 });
    expect(result.method).toBe("truncate");
    expect(countTokens(result.text)).toBeLessThanOrEqual(10);
  });

  it("summarizes via the model when the output genuinely exceeds the budget", async () => {
    const output = textWithAtLeastTokens(200);
    const model = mockModel("a tight summary");

    const result = await compressStepOutput({ output, budgetTokens: 10, model });

    expect(result.method).toBe("summarize");
    expect(result.compressed).toBe(true);
    expect(result.text).toContain("a tight summary");
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("still mechanically caps the model's summary if it doesn't fit the budget on its own", async () => {
    const output = textWithAtLeastTokens(200);
    const longSummary = textWithAtLeastTokens(50); // model "summarized" but still overshot
    const model = mockModel(longSummary);

    const result = await compressStepOutput({ output, budgetTokens: 10, model });

    expect(countTokens(result.text)).toBeLessThanOrEqual(10);
  });

  it("degrades to mechanical truncation if the summarization call fails", async () => {
    const output = textWithAtLeastTokens(200);
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("provider exploded");
      },
    });

    const result = await compressStepOutput({ output, budgetTokens: 10, model });

    expect(result.method).toBe("truncate");
    expect(countTokens(result.text)).toBeLessThanOrEqual(10);
  });

  it("never exceeds the budget across a sweep of overage sizes and budgets", async () => {
    const model = mockModel("a summary that is itself somewhat long but should still get capped");
    for (const [overageTokens, budget] of [
      [20, 15],
      [50, 15],
      [300, 20],
      [1000, 5],
    ] as const) {
      const output = textWithAtLeastTokens(overageTokens);
      const result = await compressStepOutput({ output, budgetTokens: budget, model });
      expect(countTokens(result.text)).toBeLessThanOrEqual(budget);
    }
  });
});
