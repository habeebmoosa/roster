import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { decomposeTask, isSingleStepPlan } from "./decompose";

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

describe("decomposeTask", () => {
  it("parses a single-step plan and assigns index 1", async () => {
    const model = mockModel({
      steps: [{ goal: "Answer the refund question", needsRetrieval: true }],
    });
    const plan = await decomposeTask({ task: "What's the refund window?", model });
    expect(plan.steps).toEqual([
      { index: 1, goal: "Answer the refund question", needsRetrieval: true },
    ]);
    expect(isSingleStepPlan(plan)).toBe(true);
  });

  it("parses a multi-step plan and assigns mechanical 1-indexed positions in order", async () => {
    const model = mockModel({
      steps: [
        { goal: "Look up the customer's order status", needsRetrieval: true },
        { goal: "Draft an apology for the delay", needsRetrieval: false },
      ],
    });
    const plan = await decomposeTask({ task: "Handle this delayed-order complaint", model });
    expect(plan.steps).toEqual([
      { index: 1, goal: "Look up the customer's order status", needsRetrieval: true },
      { index: 2, goal: "Draft an apology for the delay", needsRetrieval: false },
    ]);
    expect(isSingleStepPlan(plan)).toBe(false);
  });

  it("falls back to a single-step plan restating the task if the model call fails", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("provider exploded");
      },
    });
    const plan = await decomposeTask({ task: "What's the refund window?", model });
    expect(plan.steps).toEqual([
      { index: 1, goal: "What's the refund window?", needsRetrieval: true },
    ]);
    expect(isSingleStepPlan(plan)).toBe(true);
  });

  it("falls back to a single-step plan if the model returns invalid structured output", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: "text", text: "not valid json at all" }],
        finishReason: MOCK_FINISH_REASON,
        usage: MOCK_USAGE,
        warnings: [],
      },
    });
    const plan = await decomposeTask({ task: "Summarize the account history", model });
    expect(plan.steps).toEqual([
      { index: 1, goal: "Summarize the account history", needsRetrieval: true },
    ]);
  });

  it("falls back to a single-step plan if the model returns zero steps", async () => {
    const model = mockModel({ steps: [] });
    const plan = await decomposeTask({ task: "Do the thing", model });
    expect(plan.steps).toEqual([{ index: 1, goal: "Do the thing", needsRetrieval: true }]);
  });

  it("sends the task and optional agent context in the prompt", async () => {
    const model = mockModel({ steps: [{ goal: "g", needsRetrieval: false }] });
    await decomposeTask({
      task: "Explain our pricing tiers",
      model,
      agentContext: "Financial Analyst specializing in SaaS pricing",
    });
    const call = model.doGenerateCalls[0]!;
    const promptText = JSON.stringify(call.prompt);
    expect(promptText).toContain("Explain our pricing tiers");
    expect(promptText).toContain("Financial Analyst specializing in SaaS pricing");
  });
});

describe("isSingleStepPlan", () => {
  it("is true for exactly one step", () => {
    expect(isSingleStepPlan({ steps: [{ index: 1, goal: "g", needsRetrieval: false }] })).toBe(
      true,
    );
  });

  it("is false for zero or multiple steps", () => {
    expect(isSingleStepPlan({ steps: [] })).toBe(false);
    expect(
      isSingleStepPlan({
        steps: [
          { index: 1, goal: "a", needsRetrieval: false },
          { index: 2, goal: "b", needsRetrieval: false },
        ],
      }),
    ).toBe(false);
  });
});
