import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { parseAgentDefinition } from "@/core/agent";
import { runEval, runEvalTier, type RetrieveFn } from "./runner";
import type { EvalTask } from "./types";

const definition = parseAgentDefinition({
  id: "customer-support",
  name: "Ada — Customer Support",
  role: "Customer Support Specialist",
  identity: "Calm and precise.",
  voice: "Warm but concise.",
});

const MOCK_FINISH_REASON = { unified: "stop" as const, raw: undefined };
const MOCK_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function mockModel(replyText: string): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doStream: {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "text-start", id: "1" });
          controller.enqueue({ type: "text-delta", id: "1", delta: replyText });
          controller.enqueue({ type: "text-end", id: "1" });
          controller.enqueue({
            type: "finish",
            finishReason: MOCK_FINISH_REASON,
            usage: MOCK_USAGE,
          });
          controller.close();
        },
      }),
    },
  });
}

const REFUND_TASK: EvalTask = {
  id: "refund-fee",
  input: "What's the fee for a late refund?",
  graders: [
    { type: "includes", values: ["$15"] },
    {
      type: "retrieval",
      expectedSourceUris: ["kb://support-docs/refunds.md"],
      minRecall: 1,
      minPrecision: 0,
    },
  ],
};

describe("runEvalTier / runEval with retrieval", () => {
  it("runs without a retrieve function exactly as before (no retrievedSourceUris)", async () => {
    const model = mockModel("some generic reply");
    const result = await runEvalTier(definition, { tier: "cheap", modelLabel: "mock", model }, [
      REFUND_TASK,
    ]);
    expect(result.cases[0]!.retrievedSourceUris).toBeUndefined();
    // The retrieval grader fails with no retrieval context — minRecall: 1 with nothing retrieved.
    expect(result.cases[0]!.passed).toBe(false);
  });

  it("passes the tier's own model into the retrieve function", async () => {
    const model = mockModel("the fee is $15");
    const retrieve = vi.fn<RetrieveFn>(async () => ({
      text: "[Knowledge: kb://support-docs/refunds.md]\nThe fee is $15.",
      sourceUris: ["kb://support-docs/refunds.md"],
    }));

    await runEvalTier(
      definition,
      { tier: "cheap", modelLabel: "mock", model },
      [REFUND_TASK],
      retrieve,
    );

    expect(retrieve).toHaveBeenCalledWith(REFUND_TASK.input, model);
  });

  it("threads retrievedSourceUris into the case result and satisfies the retrieval grader", async () => {
    const model = mockModel("the fee is $15");
    const retrieve: RetrieveFn = async () => ({
      text: "[Knowledge: kb://support-docs/refunds.md]\nThe fee is $15.",
      sourceUris: ["kb://support-docs/refunds.md"],
    });

    const result = await runEvalTier(
      definition,
      { tier: "cheap", modelLabel: "mock", model },
      [REFUND_TASK],
      retrieve,
    );

    expect(result.cases[0]!.retrievedSourceUris).toEqual(["kb://support-docs/refunds.md"]);
    expect(result.cases[0]!.passed).toBe(true);
    expect(result.successRate).toBe(1);
  });

  it("fails the retrieval grader when the expected source wasn't retrieved, even if the text grader passes", async () => {
    const model = mockModel("the fee is $15");
    const retrieve: RetrieveFn = async () => ({
      text: "[Knowledge: kb://support-docs/shipping.md]\nUnrelated shipping info.",
      sourceUris: ["kb://support-docs/shipping.md"],
    });

    const result = await runEvalTier(
      definition,
      { tier: "cheap", modelLabel: "mock", model },
      [REFUND_TASK],
      retrieve,
    );

    expect(result.cases[0]!.passed).toBe(false);
    expect(result.cases[0]!.failures.join(" ")).toContain("recall");
  });

  it("computes per-case and per-tier cost when the tier has pricing", async () => {
    const model = mockModel("the fee is $15");
    const retrieve: RetrieveFn = async () => ({
      text: "[Knowledge: kb://support-docs/refunds.md]\nThe fee is $15.",
      sourceUris: ["kb://support-docs/refunds.md"],
    });

    const result = await runEvalTier(
      definition,
      {
        tier: "cheap",
        modelLabel: "mock",
        model,
        pricing: { inputPerMTok: 1, outputPerMTok: 5 },
      },
      [REFUND_TASK],
      retrieve,
    );

    const [caseResult] = result.cases;
    expect(caseResult!.inputTokens).toBe(1);
    expect(caseResult!.outputTokens).toBe(1);
    // 1 input token @ $1/MTok + 1 output token @ $5/MTok
    expect(caseResult!.costUsd).toBeCloseTo(0.000001 + 0.000005);
    expect(result.avgCostUsd).toBeCloseTo(caseResult!.costUsd!);
  });

  it("leaves cost undefined/zero when the tier has no pricing", async () => {
    const model = mockModel("the fee is $15");
    const result = await runEvalTier(definition, { tier: "cheap", modelLabel: "mock", model }, [
      REFUND_TASK,
    ]);

    expect(result.cases[0]!.costUsd).toBeUndefined();
    expect(result.avgCostUsd).toBe(0);
  });

  it("runEval threads the same retrieve function across every tier", async () => {
    const retrieve: RetrieveFn = async () => ({
      text: "[Knowledge: kb://support-docs/refunds.md]\nThe fee is $15.",
      sourceUris: ["kb://support-docs/refunds.md"],
    });
    const results = await runEval({
      definition,
      tasks: [REFUND_TASK],
      tiers: [
        { tier: "frontier", modelLabel: "a", model: mockModel("the fee is $15") },
        { tier: "cheap", modelLabel: "b", model: mockModel("the fee is $15") },
      ],
      retrieve,
    });
    expect(results.every((r) => r.cases[0]!.passed)).toBe(true);
  });
});
