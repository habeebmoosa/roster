import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { rollbackToSingleStep, runStepWithRetry } from "./retry";
import type { WorkflowStep } from "./decompose";

const SYSTEM_PROMPT = "You are Ada, a Customer Support Specialist. Calm and precise.";

const MOCK_FINISH_REASON = { unified: "stop" as const, raw: undefined };
const MOCK_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function step(overrides: Partial<WorkflowStep> = {}): WorkflowStep {
  return { index: 1, goal: "Answer the refund question", needsRetrieval: false, ...overrides };
}

/** A model whose queued replies are returned one per call, in order. */
function sequencedModel(replies: string[]): MockLanguageModelV4 {
  let call = 0;
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const text = replies[Math.min(call, replies.length - 1)]!;
      call += 1;
      return {
        content: [{ type: "text", text }],
        finishReason: MOCK_FINISH_REASON,
        usage: MOCK_USAGE,
        warnings: [],
      };
    },
  });
}

describe("runStepWithRetry", () => {
  it("passes on the first attempt without retrying", async () => {
    const model = sequencedModel(["a real answer"]);
    const run = await runStepWithRetry({ model, step: step(), systemPrompt: SYSTEM_PROMPT });

    expect(run.attempts).toBe(1);
    expect(run.validation.passed).toBe(true);
    expect(run.result.output).toBe("a real answer");
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("retries once and passes if the retry produces valid output", async () => {
    const model = sequencedModel(["", "a corrected answer"]);
    const run = await runStepWithRetry({ model, step: step(), systemPrompt: SYSTEM_PROMPT });

    expect(run.attempts).toBe(2);
    expect(run.validation.passed).toBe(true);
    expect(run.result.output).toBe("a corrected answer");
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  it("sums usage across both the failed attempt and the retry, not just the last one", async () => {
    const model = sequencedModel(["", "a corrected answer"]);
    const run = await runStepWithRetry({ model, step: step(), systemPrompt: SYSTEM_PROMPT });

    expect(run.usage).toEqual({ inputTokens: 2, outputTokens: 2 });
  });

  it("feeds the first failure's reason into the retry prompt", async () => {
    const model = sequencedModel(["", "a corrected answer"]);
    await runStepWithRetry({ model, step: step(), systemPrompt: SYSTEM_PROMPT });

    const retryCall = model.doGenerateCalls[1]!;
    expect(JSON.stringify(retryCall.prompt)).toContain("empty response");
  });

  it("stops after exactly one retry and surfaces failure if it still fails", async () => {
    const model = sequencedModel(["", "", "would never be reached"]);
    const run = await runStepWithRetry({ model, step: step(), systemPrompt: SYSTEM_PROMPT });

    expect(run.attempts).toBe(2);
    expect(run.validation.passed).toBe(false);
    expect(model.doGenerateCalls).toHaveLength(2);
  });
});

describe("rollbackToSingleStep", () => {
  it("re-attempts the whole task as a single step", async () => {
    const model = sequencedModel(["the whole-task answer"]);
    const run = await rollbackToSingleStep({
      model,
      task: "What's the refund window?",
      systemPrompt: SYSTEM_PROMPT,
    });

    expect(run.validation.passed).toBe(true);
    expect(run.result.step).toEqual({
      index: 1,
      goal: "What's the refund window?",
      needsRetrieval: true,
    });
    expect(run.result.output).toBe("the whole-task answer");
  });

  it("still gets its own single retry if the rollback attempt itself fails validation", async () => {
    const model = sequencedModel(["", "recovered on rollback's retry"]);
    const run = await rollbackToSingleStep({
      model,
      task: "Handle this complaint",
      systemPrompt: SYSTEM_PROMPT,
    });

    expect(run.attempts).toBe(2);
    expect(run.validation.passed).toBe(true);
    expect(run.result.output).toBe("recovered on rollback's retry");
  });
});
