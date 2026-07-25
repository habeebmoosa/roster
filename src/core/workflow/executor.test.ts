import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { executeStep, type StepRetrieveFn } from "./executor";
import type { WorkflowStep } from "./decompose";

const SYSTEM_PROMPT = "You are Ada, a Customer Support Specialist. Calm and precise.";

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

function step(overrides: Partial<WorkflowStep> = {}): WorkflowStep {
  return { index: 1, goal: "Answer the refund question", needsRetrieval: false, ...overrides };
}

describe("executeStep", () => {
  it("calls the model with the given system prompt and the step's goal, returning its raw output", async () => {
    const model = mockModel("The fee is $15.");
    const result = await executeStep({ model, step: step(), systemPrompt: SYSTEM_PROMPT });

    expect(result.output).toBe("The fee is $15.");
    expect(result.step).toEqual(step());
    expect(result.retrievedSourceUris).toBeUndefined();
    expect(result.usage).toEqual({ inputTokens: 1, outputTokens: 1 });

    const call = model.doGenerateCalls[0]!;
    const promptText = JSON.stringify(call.prompt);
    expect(promptText).toContain("Answer the refund question");
    expect(promptText).toContain("Ada");
  });

  it("does not call retrieve when the step doesn't need retrieval, even if a retrieve fn is given", async () => {
    const model = mockModel("some reply");
    const retrieve = vi.fn<StepRetrieveFn>(async () => ({ text: "unused", sourceUris: [] }));

    await executeStep({
      model,
      step: step({ needsRetrieval: false }),
      systemPrompt: SYSTEM_PROMPT,
      retrieve,
    });

    expect(retrieve).not.toHaveBeenCalled();
  });

  it("calls retrieve with the step's own goal when needsRetrieval is true, and folds context into the prompt", async () => {
    const model = mockModel("The fee is $15.");
    const retrieve = vi.fn<StepRetrieveFn>(async () => ({
      text: "[Knowledge: kb://support-docs/refunds.md]\nThe fee is $15.",
      sourceUris: ["kb://support-docs/refunds.md"],
    }));

    const result = await executeStep({
      model,
      step: step({ goal: "Look up the refund fee", needsRetrieval: true }),
      systemPrompt: SYSTEM_PROMPT,
      retrieve,
    });

    expect(retrieve).toHaveBeenCalledWith("Look up the refund fee", model);
    expect(result.retrievedSourceUris).toEqual(["kb://support-docs/refunds.md"]);
    expect(result.retrievedContext).toBe(
      "[Knowledge: kb://support-docs/refunds.md]\nThe fee is $15.",
    );

    const call = model.doGenerateCalls[0]!;
    expect(JSON.stringify(call.prompt)).toContain("kb://support-docs/refunds.md");
  });

  it("skips retrieval when needsRetrieval is true but no retrieve fn is supplied", async () => {
    const model = mockModel("some reply");
    const result = await executeStep({
      model,
      step: step({ needsRetrieval: true }),
      systemPrompt: SYSTEM_PROMPT,
    });
    expect(result.retrievedSourceUris).toBeUndefined();
    expect(result.retrievedContext).toBeUndefined();
  });

  it("includes prior step outputs as context, in order", async () => {
    const model = mockModel("final answer");
    await executeStep({
      model,
      step: step({ goal: "Draft the reply" }),
      systemPrompt: SYSTEM_PROMPT,
      priorStepOutputs: ["order is delayed", "customer is on the pro plan"],
    });

    const call = model.doGenerateCalls[0]!;
    const promptText = JSON.stringify(call.prompt);
    const orderIdx = promptText.indexOf("order is delayed");
    const planIdx = promptText.indexOf("customer is on the pro plan");
    expect(orderIdx).toBeGreaterThan(-1);
    expect(planIdx).toBeGreaterThan(orderIdx);
  });

  it("folds a previous failure reason into the prompt when retrying", async () => {
    const model = mockModel("a corrected answer");
    await executeStep({
      model,
      step: step(),
      systemPrompt: SYSTEM_PROMPT,
      previousFailureReason: "The response includes claims not supported by the retrieved context.",
    });

    const call = model.doGenerateCalls[0]!;
    expect(JSON.stringify(call.prompt)).toContain(
      "The response includes claims not supported by the retrieved context.",
    );
  });
});
