import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { prisma } from "@/server/db/prisma";
import { upsertAgent } from "@/server/db/repositories/agent.repository";
import { listUsageEventsForUser } from "@/server/db/repositories/usage-event.repository";
import { addProviderKey } from "@/server/providers/service";
import { streamRestChat } from "@/server/rest/chat-stream";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * streamRestChat()'s SSE framing end-to-end (offline): unlike the chat UI's
 * AI SDK UI Message Stream protocol (Phase 11), the REST API frames chunks as
 * plain `data: {"type":...}` SSE events for third-party (curl/python) callers.
 */
const API_KEY = "test-key-123";
let mock: MockServer;
let userId: string;
let userWithNoKey: string;

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
  await upsertAgent(loadAgentDefinitionFile("agents/customer-support/agent.yaml"));
  const [user, otherUser] = await Promise.all([
    prisma.user.create({ data: { email: `rest-stream-${Date.now()}@test.local` } }),
    prisma.user.create({ data: { email: `rest-stream-nokey-${Date.now()}@test.local` } }),
  ]);
  userId = user.id;
  userWithNoKey = otherUser.id;
  await addProviderKey({
    userId,
    provider: "custom",
    apiKey: API_KEY,
    model: "mock-model",
    baseUrl: mock.url,
  });
});

afterAll(async () => {
  await prisma.usageEvent.deleteMany({ where: { userId: { in: [userId, userWithNoKey] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userId, userWithNoKey] } } });
  await mock.close();
  await prisma.$disconnect();
});

async function readFrames(stream: ReadableStream<Uint8Array>): Promise<unknown[]> {
  const text = await new Response(stream).text();
  return text
    .split("\n\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice("data: ".length))
    .filter((raw) => raw !== "[DONE]")
    .map((raw) => JSON.parse(raw));
}

describe("streamRestChat", () => {
  it("streams delta frames then [DONE] for a successful reply (stored provider key)", async () => {
    const stream = streamRestChat({
      userId,
      agentId: "customer-support",
      provider: "custom",
      model: "mock-model",
      messages: [{ role: "user", content: "I want a refund" }],
    });

    const frames = await readFrames(stream);
    const text = frames.map((f) => (f as { content: string }).content).join("");
    expect(text).toBe("Hello world");
    expect(frames.every((f) => (f as { type: string }).type === "delta")).toBe(true);

    // The REST API never creates a Conversation, so this is the only place
    // its usage gets captured — a null conversationId, source "rest".
    const usageEvents = await listUsageEventsForUser(userId);
    expect(usageEvents).toHaveLength(1);
    expect(usageEvents[0]).toMatchObject({
      agentId: "customer-support",
      conversationId: null,
      source: "rest",
      provider: "custom",
      model: "mock-model",
      costUsd: null,
    });
  });

  it("streams an ephemeral-key reply without touching the user's stored keys", async () => {
    const stream = streamRestChat({
      userId: userWithNoKey,
      agentId: "customer-support",
      provider: "custom",
      model: "mock-model",
      messages: [{ role: "user", content: "hi" }],
      ephemeralKey: { apiKey: API_KEY, baseUrl: mock.url },
    });

    const frames = await readFrames(stream);
    const text = frames.map((f) => (f as { content: string }).content).join("");
    expect(text).toBe("Hello world");
  });

  it("frames a missing BYOK key as an error event, not a thrown exception", async () => {
    const stream = streamRestChat({
      userId: userWithNoKey,
      agentId: "customer-support",
      provider: "custom",
      model: "mock-model",
      messages: [{ role: "user", content: "hi" }],
    });

    const frames = await readFrames(stream);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ type: "error", error: { code: "unknown_provider" } });
  });
});
