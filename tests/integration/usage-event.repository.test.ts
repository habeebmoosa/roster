import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { upsertAgent } from "@/server/db/repositories/agent.repository";
import {
  createUsageEvent,
  listUsageEventsForUser,
} from "@/server/db/repositories/usage-event.repository";
import { prisma } from "@/server/db/prisma";

const AGENT_ID = "customer-support"; // real, seeded — only this test's own rows are touched
let userId: string;

beforeAll(async () => {
  await upsertAgent(loadAgentDefinitionFile(`agents/${AGENT_ID}/agent.yaml`));
  const user = await prisma.user.create({
    data: { email: `usage-event-repo-${Date.now()}@test.local` },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.usageEvent.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("usage event repository", () => {
  it("starts with no usage events for a fresh user", async () => {
    expect(await listUsageEventsForUser(userId)).toEqual([]);
  });

  it("records a chat-sourced usage event with a real cost", async () => {
    await createUsageEvent({
      userId,
      agentId: AGENT_ID,
      conversationId: "conv-1",
      source: "chat",
      provider: "anthropic",
      model: "claude-sonnet-5",
      inputTokens: 100,
      outputTokens: 200,
      costUsd: 0.0033,
    });

    const events = await listUsageEventsForUser(userId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      agentId: AGENT_ID,
      conversationId: "conv-1",
      source: "chat",
      provider: "anthropic",
      model: "claude-sonnet-5",
      inputTokens: 100,
      outputTokens: 200,
      costUsd: 0.0033,
    });
  });

  it("records a REST-sourced usage event with no conversationId and a null cost", async () => {
    await createUsageEvent({
      userId,
      agentId: AGENT_ID,
      source: "rest",
      provider: "ollama",
      model: "llama3.1",
      inputTokens: 50,
      outputTokens: 75,
      costUsd: null,
    });

    const events = await listUsageEventsForUser(userId);
    const restEvent = events.find((e) => e.source === "rest");
    expect(restEvent).toMatchObject({
      conversationId: null,
      provider: "ollama",
      model: "llama3.1",
      inputTokens: 50,
      outputTokens: 75,
      costUsd: null,
    });
  });

  it("lists newest first", async () => {
    const events = await listUsageEventsForUser(userId);
    const timestamps = events.map((e) => e.createdAt.getTime());
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });
});
