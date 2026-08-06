import { tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import type { WorkflowStepEvent } from "@/core/workflow";
import { parseAgentDefinition } from "./definition";
import { runAgent } from "./run-agent";

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

/**
 * A model whose decompose call (the first doGenerate) returns plain,
 * non-JSON text — decomposeTask's schema validation fails on that, so it
 * falls back to a single-step plan and runAgent takes the bypass path,
 * exactly like pre-Phase-8. `streamText` is what the bypass's streamText()
 * call then streams back.
 */
function bypassModel(streamText: string): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: "not a structured plan" }],
      finishReason: MOCK_FINISH_REASON,
      usage: MOCK_USAGE,
      warnings: [],
    },
    doStream: {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "text-start", id: "1" });
          controller.enqueue({ type: "text-delta", id: "1", delta: streamText });
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

/**
 * A model whose first doGenerate call (decompose) returns a real multi-step
 * plan, and whose subsequent doGenerate calls (each step's executeStep) reply
 * in order from `stepReplies`.
 */
function multiStepModel(
  planSteps: Array<{ goal: string; needsRetrieval: boolean }>,
  stepReplies: string[],
): MockLanguageModelV4 {
  let call = 0;
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const isDecomposeCall = call === 0;
      const text = isDecomposeCall
        ? JSON.stringify({ steps: planSteps })
        : stepReplies[Math.min(call - 1, stepReplies.length - 1)]!;
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

describe("runAgent — bypass path (single-step plan)", () => {
  it("streams a reply using the persona system prompt when no retrieval/episodic context is given", async () => {
    const model = bypassModel("Hi");
    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "hi" }],
    });
    let text = "";
    for await (const chunk of result.textStream) text += chunk;
    expect(text).toBe("Hi");

    const call = model.doStreamCalls[0]!;
    const prompt = JSON.stringify(call.prompt);
    expect(prompt).toContain("Ada");
    expect(prompt).not.toContain("Reference material");
  });

  it("pays for exactly one decomposition call before streaming, same shape as pre-Phase-8", async () => {
    const model = bypassModel("Hi");
    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "hi" }],
    });
    for await (const _chunk of result.textStream) void _chunk;
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(model.doStreamCalls).toHaveLength(1);
  });

  it("forwards retrievedContext into the system prompt", async () => {
    const model = bypassModel("Hi");
    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "hi" }],
      retrievedContext: "Refunds are available within 30 days.",
    });
    for await (const _chunk of result.textStream) void _chunk;
    const call = model.doStreamCalls[0]!;
    expect(JSON.stringify(call.prompt)).toContain("Refunds are available within 30 days.");
  });

  it("forwards episodicMemory into the system prompt", async () => {
    const model = bypassModel("Hi");
    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "hi" }],
      episodicMemory: [{ key: "preference:tone", value: "prefers short replies" }],
    });
    for await (const _chunk of result.textStream) void _chunk;
    const call = model.doStreamCalls[0]!;
    expect(JSON.stringify(call.prompt)).toContain("prefers short replies");
  });

  it("never fires onStepEvent — the bypass skips the workflow entirely", async () => {
    const model = bypassModel("Hi");
    const events: WorkflowStepEvent[] = [];
    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "hi" }],
      onStepEvent: (event) => events.push(event),
    });
    for await (const _chunk of result.textStream) void _chunk;
    expect(events).toEqual([]);
  });

  it("passes tools through to the model call when given", async () => {
    const model = bypassModel("Hi");
    const echo = tool({
      description: "Echo",
      inputSchema: z.object({ text: z.string() }),
      execute: async ({ text }) => text,
    });

    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "hi" }],
      tools: { echo },
    });
    for await (const _chunk of result.textStream) void _chunk;

    const call = model.doStreamCalls[0]!;
    expect(call.tools?.map((t) => t.name)).toContain("echo");
  });

  it("does not pass a tools option when none are given", async () => {
    const model = bypassModel("Hi");
    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "hi" }],
    });
    for await (const _chunk of result.textStream) void _chunk;

    const call = model.doStreamCalls[0]!;
    expect(call.tools ?? []).toEqual([]);
  });

  it("passes providerOptions through to the model call when given (reasoning-capable models)", async () => {
    const model = bypassModel("Hi");
    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "hi" }],
      providerOptions: { anthropic: { thinking: { type: "enabled", budgetTokens: 4096 } } },
    });
    for await (const _chunk of result.textStream) void _chunk;

    const call = model.doStreamCalls[0]!;
    expect(call.providerOptions).toEqual({
      anthropic: { thinking: { type: "enabled", budgetTokens: 4096 } },
    });
  });

  it("does not pass a providerOptions option when none are given", async () => {
    const model = bypassModel("Hi");
    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "hi" }],
    });
    for await (const _chunk of result.textStream) void _chunk;

    const call = model.doStreamCalls[0]!;
    expect(call.providerOptions ?? {}).toEqual({});
  });

  it("exposes fullStream with the raw stream parts, for reasoning/tool-call visibility", async () => {
    const model = bypassModel("Hi");
    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.fullStream).toBeDefined();
    const types: string[] = [];
    for await (const part of result.fullStream!) types.push(part.type);
    expect(types).toContain("text-delta");
    expect(types).toContain("finish");
  });
});

describe("runAgent — multi-step workflow path", () => {
  it("runs the full workflow when decompose returns more than one step, and returns the final validated answer", async () => {
    const model = multiStepModel(
      [
        { goal: "Look up the order status", needsRetrieval: false },
        { goal: "Draft a reply", needsRetrieval: false },
      ],
      ["order is delayed", "Sorry for the delay!"],
    );

    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "My order is late, what happened?" }],
    });

    const text = await result.text;
    expect(text).toBe("Sorry for the delay!");

    let streamed = "";
    for await (const chunk of result.textStream) streamed += chunk;
    expect(streamed).toBe("Sorry for the delay!");
  });

  it("aggregates usage across the decomposition and every step call", async () => {
    const model = multiStepModel(
      [
        { goal: "Step one", needsRetrieval: false },
        { goal: "Step two", needsRetrieval: false },
      ],
      ["first", "second"],
    );

    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "Do a two-part task" }],
    });

    const usage = await result.usage;
    // 2 step calls at 1 input/output token each (decompose's own usage isn't
    // counted — only step execution cost is tracked as workflow usage).
    expect(usage).toEqual({ inputTokens: 2, outputTokens: 2 });
  });

  it("emits step-start and step-complete events for every step", async () => {
    const model = multiStepModel(
      [
        { goal: "Step one", needsRetrieval: false },
        { goal: "Step two", needsRetrieval: false },
      ],
      ["first", "second"],
    );
    const events: WorkflowStepEvent[] = [];

    await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "Do a two-part task" }],
      onStepEvent: (event) => events.push(event),
    });

    expect(events).toEqual([
      { type: "step-start", index: 1, goal: "Step one" },
      { type: "step-complete", index: 1, passed: true, attempts: 1 },
      { type: "step-start", index: 2, goal: "Step two" },
      { type: "step-complete", index: 2, passed: true, attempts: 1 },
    ]);
  });

  it("passes tools through to every step's model call", async () => {
    const model = multiStepModel(
      [
        { goal: "Step one", needsRetrieval: false },
        { goal: "Step two", needsRetrieval: false },
      ],
      ["first", "second"],
    );
    const echo = tool({
      description: "Echo",
      inputSchema: z.object({ text: z.string() }),
      execute: async ({ text }) => text,
    });

    await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "Do a two-part task" }],
      tools: { echo },
    });

    // Call 0 is decomposition (no tools — that's core/workflow/decompose's own
    // structured-output call); calls 1+ are each step's executeStep call.
    expect(model.doGenerateCalls[1]?.tools?.map((t) => t.name)).toContain("echo");
    expect(model.doGenerateCalls[2]?.tools?.map((t) => t.name)).toContain("echo");
  });

  it("never exposes fullStream — this path never streams live", async () => {
    const model = multiStepModel(
      [
        { goal: "Step one", needsRetrieval: false },
        { goal: "Step two", needsRetrieval: false },
      ],
      ["first", "second"],
    );

    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "Do a two-part task" }],
    });

    expect(result.fullStream).toBeUndefined();
  });
});
