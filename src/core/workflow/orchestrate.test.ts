import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { countTokens } from "@/lib/tokens";
import { runWorkflow, type WorkflowStepEvent } from "./orchestrate";
import type { WorkflowPlan } from "./decompose";

const SYSTEM_PROMPT = "You are Ada, a Customer Support Specialist.";

const MOCK_FINISH_REASON = { unified: "stop" as const, raw: undefined };
const MOCK_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

/** A model whose queued replies are returned one per call, in order (last one repeats if exhausted). */
function queuedModel(replies: string[]): MockLanguageModelV4 {
  let call = 0;
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const text = replies[Math.min(call, replies.length - 1)] ?? "";
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

function twoStepPlan(): WorkflowPlan {
  return {
    steps: [
      { index: 1, goal: "Look up the order status", needsRetrieval: false },
      { index: 2, goal: "Draft a reply", needsRetrieval: false },
    ],
  };
}

function textWithAtLeastTokens(minTokens: number): string {
  let text = "";
  while (countTokens(text) < minTokens) text += "lorem ipsum dolor sit amet consectetur ";
  return text.trim();
}

describe("runWorkflow", () => {
  it("runs every step in order and returns the last step's output when all pass", async () => {
    const model = queuedModel(["order is delayed", "Sorry for the delay!"]);
    const result = await runWorkflow({
      model,
      plan: twoStepPlan(),
      task: "Handle this delayed-order complaint",
      systemPrompt: SYSTEM_PROMPT,
      contextBudgetTokens: 10_000,
    });

    expect(result.text).toBe("Sorry for the delay!");
    expect(result.failed).toBe(false);
    expect(result.usage).toEqual({ inputTokens: 2, outputTokens: 2 });
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  it("passes each step's compressed output forward as context for the next step", async () => {
    const model = queuedModel(["order is delayed", "final reply"]);
    await runWorkflow({
      model,
      plan: twoStepPlan(),
      task: "Handle this complaint",
      systemPrompt: SYSTEM_PROMPT,
      contextBudgetTokens: 10_000,
    });

    const secondCall = model.doGenerateCalls[1]!;
    expect(JSON.stringify(secondCall.prompt)).toContain("order is delayed");
  });

  it("mechanically truncates a step's output before it becomes the next step's context, when it overflows the budget", async () => {
    const longOutput = textWithAtLeastTokens(30);
    const model = queuedModel([longOutput, "final reply"]);

    await runWorkflow({
      model,
      plan: twoStepPlan(),
      task: "Handle this complaint",
      systemPrompt: SYSTEM_PROMPT,
      contextBudgetTokens: 15, // overage < 3x — mechanical truncation only, no extra model call
    });

    // Only the 2 step calls — no compression LLM call for a mild overage.
    expect(model.doGenerateCalls).toHaveLength(2);
    const secondCall = model.doGenerateCalls[1]!;
    const promptText = JSON.stringify(secondCall.prompt);
    expect(promptText).not.toContain(longOutput);
    expect(promptText).toContain("…");
  });

  it("emits step-start and step-complete events in order for every step", async () => {
    const model = queuedModel(["order is delayed", "final reply"]);
    const events: WorkflowStepEvent[] = [];

    await runWorkflow({
      model,
      plan: twoStepPlan(),
      task: "Handle this complaint",
      systemPrompt: SYSTEM_PROMPT,
      contextBudgetTokens: 10_000,
      onStepEvent: (event) => events.push(event),
    });

    expect(events).toEqual([
      { type: "step-start", index: 1, goal: "Look up the order status" },
      { type: "step-complete", index: 1, passed: true, attempts: 1 },
      { type: "step-start", index: 2, goal: "Draft a reply" },
      { type: "step-complete", index: 2, passed: true, attempts: 1 },
    ]);
  });

  it("rolls back to a single-step re-attempt of the whole task when a step fails even after its retry", async () => {
    // Step 1 fails twice (both attempts empty output), then rollback succeeds.
    const model = queuedModel(["", "", "the whole-task answer"]);
    const events: WorkflowStepEvent[] = [];

    const result = await runWorkflow({
      model,
      plan: twoStepPlan(),
      task: "Handle this delayed-order complaint",
      systemPrompt: SYSTEM_PROMPT,
      contextBudgetTokens: 10_000,
      onStepEvent: (event) => events.push(event),
    });

    expect(result.text).toBe("the whole-task answer");
    expect(result.failed).toBe(false);
    expect(model.doGenerateCalls).toHaveLength(3);
    expect(events.some((e) => e.type === "rollback")).toBe(true);
    // Step 2 never runs — the plan aborted after step 1's rollback.
    expect(events.some((e) => "index" in e && e.index === 2)).toBe(false);
  });

  it("surfaces a workflow failure when the rollback attempt also fails", async () => {
    // Step 1 fails twice, then rollback fails twice too.
    const model = queuedModel(["", "", "", ""]);
    const result = await runWorkflow({
      model,
      plan: twoStepPlan(),
      task: "Handle this complaint",
      systemPrompt: SYSTEM_PROMPT,
      contextBudgetTokens: 10_000,
    });

    expect(result.failed).toBe(true);
    expect(model.doGenerateCalls).toHaveLength(4);
  });

  it("aggregates usage across every model call, including a rollback", async () => {
    const model = queuedModel(["", "", "the whole-task answer"]);
    const result = await runWorkflow({
      model,
      plan: twoStepPlan(),
      task: "Handle this complaint",
      systemPrompt: SYSTEM_PROMPT,
      contextBudgetTokens: 10_000,
    });

    expect(result.usage).toEqual({ inputTokens: 3, outputTokens: 3 });
  });
});
