import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { validateGroundedness, validateShape, validateStep } from "./validate";
import type { StepExecutionResult } from "./executor";
import type { WorkflowStep } from "./decompose";

function step(overrides: Partial<WorkflowStep> = {}): WorkflowStep {
  return { index: 1, goal: "Answer the refund question", needsRetrieval: false, ...overrides };
}

function stepResult(overrides: Partial<StepExecutionResult> = {}): StepExecutionResult {
  return {
    step: step(),
    output: "The fee is $15.",
    usage: { inputTokens: 1, outputTokens: 1 },
    ...overrides,
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

describe("validateShape", () => {
  it("passes non-empty output", () => {
    expect(validateShape(stepResult({ output: "a real answer" }))).toEqual({ passed: true });
  });

  it("fails empty output", () => {
    const result = validateShape(stepResult({ output: "" }));
    expect(result.passed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("fails whitespace-only output", () => {
    const result = validateShape(stepResult({ output: "   \n  " }));
    expect(result.passed).toBe(false);
  });
});

describe("validateGroundedness", () => {
  it("passes when the model judges the output grounded", async () => {
    const model = mockModel({ grounded: true });
    const result = await validateGroundedness({
      output: "The fee is $15.",
      retrievedContext: "[Knowledge: kb://refunds.md]\nThe fee is $15.",
      model,
    });
    expect(result).toEqual({ passed: true });
  });

  it("fails with the model's reason when judged not grounded", async () => {
    const model = mockModel({ grounded: false, reason: "No mention of a $15 fee in the context." });
    const result = await validateGroundedness({
      output: "The fee is $15.",
      retrievedContext: "[Knowledge: kb://refunds.md]\nRefunds are free.",
      model,
    });
    expect(result).toEqual({
      passed: false,
      reason: "No mention of a $15 fee in the context.",
    });
  });

  it("degrades gracefully (passes) if the model call fails", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("provider exploded");
      },
    });
    const result = await validateGroundedness({
      output: "The fee is $15.",
      retrievedContext: "context",
      model,
    });
    expect(result).toEqual({ passed: true });
  });

  it("degrades gracefully (passes) if the model returns invalid structured output", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: "text", text: "not valid json" }],
        finishReason: MOCK_FINISH_REASON,
        usage: MOCK_USAGE,
        warnings: [],
      },
    });
    const result = await validateGroundedness({
      output: "The fee is $15.",
      retrievedContext: "context",
      model,
    });
    expect(result).toEqual({ passed: true });
  });

  it("sends both the output and the retrieved context in the prompt", async () => {
    const model = mockModel({ grounded: true });
    await validateGroundedness({
      output: "the answer text",
      retrievedContext: "the context text",
      model,
    });
    const promptText = JSON.stringify(model.doGenerateCalls[0]!.prompt);
    expect(promptText).toContain("the answer text");
    expect(promptText).toContain("the context text");
  });
});

describe("validateStep", () => {
  it("fails on shape without ever calling a groundedness model", async () => {
    const model = mockModel({ grounded: true });
    const result = await validateStep({
      result: stepResult({ output: "" }),
      groundednessModel: model,
    });
    expect(result.passed).toBe(false);
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("skips groundedness when the step didn't need retrieval, even with a groundedness model supplied", async () => {
    const model = mockModel({ grounded: false, reason: "shouldn't matter" });
    const result = await validateStep({
      result: stepResult({ step: step({ needsRetrieval: false }) }),
      groundednessModel: model,
    });
    expect(result).toEqual({ passed: true });
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("skips groundedness when the step needed retrieval but has no retrievedContext", async () => {
    const model = mockModel({ grounded: false });
    const result = await validateStep({
      result: stepResult({ step: step({ needsRetrieval: true }), retrievedContext: undefined }),
      groundednessModel: model,
    });
    expect(result).toEqual({ passed: true });
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("skips groundedness when no groundedness model is supplied", async () => {
    const result = await validateStep({
      result: stepResult({
        step: step({ needsRetrieval: true }),
        retrievedContext: "some retrieved context",
      }),
    });
    expect(result).toEqual({ passed: true });
  });

  it("runs groundedness when the step used retrieval, has context, and a model is supplied", async () => {
    const model = mockModel({ grounded: false, reason: "unsupported claim" });
    const result = await validateStep({
      result: stepResult({
        step: step({ needsRetrieval: true }),
        retrievedContext: "some retrieved context",
      }),
      groundednessModel: model,
    });
    expect(result).toEqual({ passed: false, reason: "unsupported claim" });
    expect(model.doGenerateCalls).toHaveLength(1);
  });
});
