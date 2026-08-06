import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { upsertAgent } from "@/server/db/repositories/agent.repository";
import {
  appendMessage,
  countConversationsSince,
  countConversationsSinceByAgent,
  createConversation,
  getConversationWithMessages,
  getLastActivityByAgent,
  listConversations,
} from "@/server/db/repositories/conversation.repository";
import { prisma } from "@/server/db/prisma";

const AGENT_ID = "customer-support";
const OTHER_AGENT_ID = "content-writer";
let userId: string;
let otherUserId: string;

beforeAll(async () => {
  await Promise.all([
    upsertAgent(loadAgentDefinitionFile(`agents/${AGENT_ID}/agent.yaml`)),
    upsertAgent(loadAgentDefinitionFile(`agents/${OTHER_AGENT_ID}/agent.yaml`)),
  ]);
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
    expect(full!.messages[0]!.parts).toBeNull();
    expect(full!.messages[1]).toMatchObject({ role: "assistant", content: "It's on the way." });
    expect(full!.messages[1]!.stepEvents).toEqual([
      { type: "step-start", index: 1, goal: "Look up the order" },
    ]);
  });

  it("persists an assistant turn's ordered parts (text/reasoning/tool-call), reloadable as-is", async () => {
    const conversation = await createConversation(userId, AGENT_ID, "Ticket lookup");

    await appendMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "Your ticket is resolved.",
      parts: [
        { type: "reasoning", text: "Let me check the ticket status.", done: true, startedAt: 0, endedAt: 10 },
        {
          type: "tool-call",
          toolCallId: "call_1",
          toolName: "mcp_linear_search",
          source: "mcp",
          connectorName: "Linear",
          input: { query: "ticket 123" },
          output: { status: "resolved" },
          state: "output-available",
        },
        { type: "text", text: "Your ticket is resolved." },
      ],
    });

    const full = await getConversationWithMessages(userId, conversation.id);
    expect(full!.messages[0]!.parts).toEqual([
      { type: "reasoning", text: "Let me check the ticket status.", done: true, startedAt: 0, endedAt: 10 },
      {
        type: "tool-call",
        toolCallId: "call_1",
        toolName: "mcp_linear_search",
        source: "mcp",
        connectorName: "Linear",
        input: { query: "ticket 123" },
        output: { status: "resolved" },
        state: "output-available",
      },
      { type: "text", text: "Your ticket is resolved." },
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

describe("conversation counts and last activity (dashboard/workers metrics)", () => {
  // A dedicated user — these assertions need precise counts, so they can't
  // share the incrementally-built-up userId from the describe block above.
  let metricsUserId: string;
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `conversation-metrics-${Date.now()}@test.local` },
    });
    metricsUserId = user.id;
  });

  afterAll(async () => {
    await prisma.conversation.deleteMany({ where: { userId: metricsUserId } });
    await prisma.user.delete({ where: { id: metricsUserId } });
  });

  it("is empty for a user with no conversations", async () => {
    expect(await countConversationsSince(metricsUserId, AGENT_ID, since30d)).toBe(0);
    expect(await countConversationsSinceByAgent(metricsUserId, since30d)).toEqual(new Map());
    expect(await getLastActivityByAgent(metricsUserId)).toEqual(new Map());
  });

  it("counts conversations within the window, per agent, and reports the most recent activity", async () => {
    const first = await createConversation(metricsUserId, AGENT_ID, "First");
    await createConversation(metricsUserId, AGENT_ID, "Second");
    const other = await createConversation(metricsUserId, OTHER_AGENT_ID, "Third");

    expect(await countConversationsSince(metricsUserId, AGENT_ID, since30d)).toBe(2);
    expect(await countConversationsSince(metricsUserId, OTHER_AGENT_ID, since30d)).toBe(1);

    const byAgent = await countConversationsSinceByAgent(metricsUserId, since30d);
    expect(byAgent.get(AGENT_ID)).toBe(2);
    expect(byAgent.get(OTHER_AGENT_ID)).toBe(1);

    // Bump `first`'s activity after `other` was created, so it becomes the most recent for AGENT_ID.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await appendMessage({ conversationId: first.id, role: "user", content: "hi again" });

    const lastActivity = await getLastActivityByAgent(metricsUserId);
    const agentActivity = lastActivity.get(AGENT_ID)!;
    const otherActivity = lastActivity.get(OTHER_AGENT_ID)!;
    expect(agentActivity.getTime()).toBeGreaterThan(other.createdAt.getTime());
    expect(otherActivity.getTime()).toBe(other.createdAt.getTime());
  });

  it("excludes a conversation older than the window from the count, but not from last-activity", async () => {
    const old = await createConversation(metricsUserId, AGENT_ID, "Old one");
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    await prisma.conversation.update({
      where: { id: old.id },
      data: { createdAt: fortyDaysAgo, updatedAt: fortyDaysAgo },
    });

    const countBefore = await countConversationsSince(metricsUserId, AGENT_ID, since30d);
    await createConversation(metricsUserId, AGENT_ID, "Recent, to compare against");
    const countAfter = await countConversationsSince(metricsUserId, AGENT_ID, since30d);

    expect(countAfter).toBe(countBefore + 1); // the 40-day-old one never counted
  });
});
