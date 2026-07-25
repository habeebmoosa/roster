import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
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

function mockModel(): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doStream: {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "text-start", id: "1" });
          controller.enqueue({ type: "text-delta", id: "1", delta: "Hi" });
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

describe("runAgent", () => {
  it("streams a reply using the persona system prompt when no retrieval/episodic context is given", async () => {
    const model = mockModel();
    const result = runAgent({ definition, model, messages: [{ role: "user", content: "hi" }] });
    let text = "";
    for await (const chunk of result.textStream) text += chunk;
    expect(text).toBe("Hi");

    const call = model.doStreamCalls[0]!;
    const prompt = JSON.stringify(call.prompt);
    expect(prompt).toContain("Ada");
    expect(prompt).not.toContain("Reference material");
  });

  it("forwards retrievedContext into the system prompt", async () => {
    const model = mockModel();
    const result = runAgent({
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
    const model = mockModel();
    const result = runAgent({
      definition,
      model,
      messages: [{ role: "user", content: "hi" }],
      episodicMemory: [{ key: "preference:tone", value: "prefers short replies" }],
    });
    for await (const _chunk of result.textStream) void _chunk;
    const call = model.doStreamCalls[0]!;
    expect(JSON.stringify(call.prompt)).toContain("prefers short replies");
  });
});
