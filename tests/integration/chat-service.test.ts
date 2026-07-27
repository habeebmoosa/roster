import type { UIMessageChunk } from "ai";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { AgentNotFoundError } from "@/server/agents/service";
import { prisma } from "@/server/db/prisma";
import { upsertAgent } from "@/server/db/repositories/agent.repository";
import {
  createConversation,
  getConversationWithMessages,
} from "@/server/db/repositories/conversation.repository";
import { addProviderKey } from "@/server/providers/service";
import { ConversationNotFoundError, sendChatMessage } from "@/server/chat/service";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * sendChatMessage() end-to-end (offline): persists the user turn, resolves a BYOK
 * model, streams a UI Message Stream (text + step-event + error parts) through
 * streamAgentChat against a mock provider, and persists the assistant's full reply
 * (plus any step events) once the stream finishes. Also proves the server — not the
 * client — is the source of truth for history on a second turn.
 */
const API_KEY = "test-key-123";
let mock: MockServer;
let userId: string;
let otherUserId: string;

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
  await upsertAgent(loadAgentDefinitionFile("agents/customer-support/agent.yaml"));
  const [user, otherUser] = await Promise.all([
    prisma.user.create({ data: { email: `chat-service-${Date.now()}@test.local` } }),
    prisma.user.create({ data: { email: `chat-service-other-${Date.now()}@test.local` } }),
  ]);
  userId = user.id;
  otherUserId = otherUser.id;
  await addProviderKey({
    userId,
    provider: "custom",
    apiKey: API_KEY,
    model: "mock-model",
    baseUrl: mock.url,
  });
});

afterAll(async () => {
  await prisma.conversation.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
  await prisma.providerKey.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  await mock.close();
  await prisma.$disconnect();
});

interface Drained {
  text: string;
  stepEvents: unknown[];
  errorText?: string;
}

async function drain(stream: ReadableStream<UIMessageChunk>): Promise<Drained> {
  const reader = stream.getReader();
  let text = "";
  const stepEvents: unknown[] = [];
  let errorText: string | undefined;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value.type === "text-delta") text += value.delta;
    else if (value.type === "data-stepEvent") stepEvents.push(value.data);
    else if (value.type === "error") errorText = value.errorText;
  }

  return { text, stepEvents, errorText };
}

describe("sendChatMessage", () => {
  it("creates a conversation, derives its title, and persists both turns", async () => {
    const result = await sendChatMessage({
      userId,
      agentId: "customer-support",
      provider: "custom",
      model: "mock-model",
      content: "I want a refund for order 123",
    });

    const drained = await drain(result.stream);
    expect(drained.text).toBe("Hello world"); // the mock provider's fixed reply
    expect(drained.errorText).toBeUndefined();

    const conversation = await getConversationWithMessages(userId, result.conversationId);
    expect(conversation).not.toBeNull();
    expect(conversation!.title).toBe("I want a refund for order 123");
    expect(conversation!.messages).toHaveLength(2);
    expect(conversation!.messages[0]).toMatchObject({
      role: "user",
      content: "I want a refund for order 123",
    });
    expect(conversation!.messages[1]).toMatchObject({ role: "assistant", content: "Hello world" });
  });

  it("truncates a long first message into a shorter title", async () => {
    const longMessage = "a".repeat(100);
    const result = await sendChatMessage({
      userId,
      agentId: "customer-support",
      provider: "custom",
      model: "mock-model",
      content: longMessage,
    });
    await drain(result.stream);

    const conversation = await getConversationWithMessages(userId, result.conversationId);
    expect(conversation!.title!.length).toBeLessThan(longMessage.length);
    expect(conversation!.title!.endsWith("…")).toBe(true);
  });

  it("loads real prior messages from the DB on a second turn, not client-resent history", async () => {
    const first = await sendChatMessage({
      userId,
      agentId: "customer-support",
      provider: "custom",
      model: "mock-model",
      content: "My order is delayed",
    });
    await drain(first.stream);

    const second = await sendChatMessage({
      userId,
      agentId: "customer-support",
      provider: "custom",
      model: "mock-model",
      conversationId: first.conversationId,
      content: "Any update?",
    });
    await drain(second.stream);

    expect(second.conversationId).toBe(first.conversationId);

    const lastRequest = mock.requests.at(-1);
    const sentMessages = JSON.stringify(lastRequest?.messages ?? []);
    // The second call's outbound prompt must include the FIRST turn's content,
    // which sendChatMessage loaded from the DB — the caller never passed it.
    expect(sentMessages).toContain("My order is delayed");
    expect(sentMessages).toContain("Any update?");

    const conversation = await getConversationWithMessages(userId, first.conversationId);
    expect(conversation!.messages).toHaveLength(4);
  });

  it("throws ConversationNotFoundError for an unknown conversationId", async () => {
    await expect(
      sendChatMessage({
        userId,
        agentId: "customer-support",
        provider: "custom",
        model: "mock-model",
        conversationId: "does-not-exist",
        content: "hi",
      }),
    ).rejects.toBeInstanceOf(ConversationNotFoundError);
  });

  it("throws ConversationNotFoundError for another user's conversation", async () => {
    const owned = await createConversation(otherUserId, "customer-support", "someone else's chat");

    await expect(
      sendChatMessage({
        userId,
        agentId: "customer-support",
        provider: "custom",
        model: "mock-model",
        conversationId: owned.id,
        content: "hi",
      }),
    ).rejects.toBeInstanceOf(ConversationNotFoundError);
  });

  it("throws AgentNotFoundError for an unknown agent on a new conversation (checked before any streaming starts)", async () => {
    await expect(
      sendChatMessage({
        userId,
        agentId: "does-not-exist",
        provider: "custom",
        model: "mock-model",
        content: "hi",
      }),
    ).rejects.toBeInstanceOf(AgentNotFoundError);
  });

  it("uses the conversation's own agent on a later turn, ignoring a mismatched input.agentId", async () => {
    const first = await sendChatMessage({
      userId,
      agentId: "customer-support",
      provider: "custom",
      model: "mock-model",
      content: "hello",
    });
    await drain(first.stream);

    // A client bug/stale state passing a different agentId shouldn't redirect the turn.
    const second = await sendChatMessage({
      userId,
      agentId: "does-not-exist",
      provider: "custom",
      model: "mock-model",
      conversationId: first.conversationId,
      content: "hi again",
    });
    const drained = await drain(second.stream);
    expect(drained.errorText).toBeUndefined();
    expect(drained.text).toBe("Hello world");
  });

  it("surfaces a missing BYOK key as a structured in-stream error part, since it's only discoverable by attempting the model call", async () => {
    const userWithNoKey = await prisma.user.create({
      data: { email: `chat-service-no-key-${Date.now()}@test.local` },
    });

    try {
      const result = await sendChatMessage({
        userId: userWithNoKey.id,
        agentId: "customer-support",
        provider: "custom",
        model: "mock-model",
        content: "hi",
      });

      const drained = await drain(result.stream);
      expect(drained.errorText).toBe("Unknown provider.");
      expect(drained.text).toBe("");

      // The user's turn is still persisted even though the assistant never replied.
      const conversation = await getConversationWithMessages(
        userWithNoKey.id,
        result.conversationId,
      );
      expect(conversation!.messages).toHaveLength(1);
      expect(conversation!.messages[0]).toMatchObject({ role: "user", content: "hi" });
    } finally {
      await prisma.conversation.deleteMany({ where: { userId: userWithNoKey.id } });
      await prisma.user.delete({ where: { id: userWithNoKey.id } });
    }
  });
});
