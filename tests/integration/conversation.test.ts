import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { upsertAgent } from "@/server/db/repositories/agent.repository";
import {
  appendMessage,
  createConversation,
  getConversationWithMessages,
  listConversations,
} from "@/server/db/repositories/conversation.repository";
import { prisma } from "@/server/db/prisma";

const AGENT_ID = "customer-support";
let userId: string;
let otherUserId: string;

beforeAll(async () => {
  await upsertAgent(loadAgentDefinitionFile(`agents/${AGENT_ID}/agent.yaml`));
  const [user, otherUser] = await Promise.all([
    prisma.user.create({ data: { email: `conversation-${Date.now()}@test.local` } }),
    prisma.user.create({ data: { email: `conversation-other-${Date.now()}@test.local` } }),
  ]);
  userId = user.id;
  otherUserId = otherUser.id;
});

afterAll(async () => {
  await prisma.conversation.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  await prisma.$disconnect();
});

describe("conversation repository", () => {
  it("starts with no conversations for a fresh user", async () => {
    expect(await listConversations(userId)).toEqual([]);
  });

  it("creates a conversation", async () => {
    const conversation = await createConversation(userId, AGENT_ID, "Refund question");
    expect(conversation.agentId).toBe(AGENT_ID);
    expect(conversation.title).toBe("Refund question");

    const listed = await listConversations(userId);
    expect(listed).toHaveLength(1);
    expect(listed[0]!.id).toBe(conversation.id);
  });

  it("creates a conversation with no title", async () => {
    const conversation = await createConversation(userId, AGENT_ID);
    expect(conversation.title).toBeNull();
    await prisma.conversation.delete({ where: { id: conversation.id } });
  });

  it("appends messages in order, including step events on an assistant turn", async () => {
    const conversation = await createConversation(userId, AGENT_ID, "Order status");

    await appendMessage({
      conversationId: conversation.id,
      role: "user",
      content: "Where's my order?",
    });
    await appendMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "It's on the way.",
      stepEvents: [{ type: "step-start", index: 1, goal: "Look up the order" }],
    });

    const full = await getConversationWithMessages(userId, conversation.id);
    expect(full).not.toBeNull();
    expect(full!.messages).toHaveLength(2);
    expect(full!.messages[0]).toMatchObject({ role: "user", content: "Where's my order?" });
    expect(full!.messages[0]!.stepEvents).toBeNull();
    expect(full!.messages[1]).toMatchObject({ role: "assistant", content: "It's on the way." });
    expect(full!.messages[1]!.stepEvents).toEqual([
      { type: "step-start", index: 1, goal: "Look up the order" },
    ]);
  });

  it("bumps the conversation's updatedAt when a message is appended (for History-drawer recency ordering)", async () => {
    const conversation = await createConversation(userId, AGENT_ID);
    const before = conversation.updatedAt;

    await new Promise((resolve) => setTimeout(resolve, 5));
    await appendMessage({ conversationId: conversation.id, role: "user", content: "hi" });

    const listed = await listConversations(userId);
    const updated = listed.find((c) => c.id === conversation.id);
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(before.getTime());
  });

  it("returns null for a conversation that doesn't exist", async () => {
    expect(await getConversationWithMessages(userId, "does-not-exist")).toBeNull();
  });

  it("returns null when the conversation belongs to a different user", async () => {
    const conversation = await createConversation(otherUserId, AGENT_ID, "Someone else's chat");
    expect(await getConversationWithMessages(userId, conversation.id)).toBeNull();
  });

  it("does not list another user's conversations", async () => {
    const listed = await listConversations(userId);
    expect(listed.every((c) => c.title !== "Someone else's chat")).toBe(true);
  });
});
