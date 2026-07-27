import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
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
 * model, streams through streamAgentChat against a mock provider, and persists the
 * assistant's full reply once the stream finishes. Also proves the server — not the
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

async function drain(stream: AsyncIterable<string>): Promise<string> {
  let text = "";
  for await (const chunk of stream) text += chunk;
  return text;
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

    const streamed = await drain(result.textStream);
    expect(streamed).toBe("Hello world"); // the mock provider's fixed reply

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
    await drain(result.textStream);

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
    await drain(first.textStream);

    const second = await sendChatMessage({
      userId,
      agentId: "customer-support",
      provider: "custom",
      model: "mock-model",
      conversationId: first.conversationId,
      content: "Any update?",
    });
    await drain(second.textStream);

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
});
