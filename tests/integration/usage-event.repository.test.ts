import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { upsertAgent } from "@/server/db/repositories/agent.repository";
import {
  createUsageEvent,
  listUsageEventsForUser,
  sumCostSince,
  sumCostSinceByAgent,
  sumTokensSince,
} from "@/server/db/repositories/usage-event.repository";
import { prisma } from "@/server/db/prisma";

const AGENT_ID = "customer-support"; // real, seeded — only this test's own rows are touched
const OTHER_AGENT_ID = "content-writer";
let userId: string;

beforeAll(async () => {
  await Promise.all([
    upsertAgent(loadAgentDefinitionFile(`agents/${AGENT_ID}/agent.yaml`)),
    upsertAgent(loadAgentDefinitionFile(`agents/${OTHER_AGENT_ID}/agent.yaml`)),
  ]);
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

describe("usage aggregation (spend/tokens metrics)", () => {
  // A dedicated user — these assertions need precise sums, so they can't
  // share the incrementally-built-up userId from the describe block above.
  let metricsUserId: string;
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `usage-metrics-${Date.now()}@test.local` },
    });
    metricsUserId = user.id;
  });

  afterAll(async () => {
    await prisma.usageEvent.deleteMany({ where: { userId: metricsUserId } });
    await prisma.user.delete({ where: { id: metricsUserId } });
  });

  it("returns null cost and zero tokens for a user with no usage at all", async () => {
    expect(await sumCostSince(metricsUserId, since30d)).toBeNull();
    expect(await sumCostSinceByAgent(metricsUserId, since30d)).toEqual(new Map());
    expect(await sumTokensSince(metricsUserId, AGENT_ID, since30d)).toEqual({ input: 0, output: 0 });
  });

  it("sums real cost and tokens per agent, excluding unpriced events from the cost sum", async () => {
    await createUsageEvent({
      userId: metricsUserId,
      agentId: AGENT_ID,
      source: "chat",
      provider: "anthropic",
      model: "claude-sonnet-5",
      inputTokens: 1000,
      outputTokens: 2000,
      costUsd: 0.03,
    });
    await createUsageEvent({
      userId: metricsUserId,
      agentId: AGENT_ID,
      source: "chat",
      provider: "ollama",
      model: "llama3.1",
      inputTokens: 500,
      outputTokens: 500,
      costUsd: null, // uncatalogued — must not count as $0 in the sum
    });
    await createUsageEvent({
      userId: metricsUserId,
      agentId: OTHER_AGENT_ID,
      source: "chat",
      provider: "anthropic",
      model: "claude-sonnet-5",
      inputTokens: 100,
      outputTokens: 100,
      costUsd: 0.01,
    });

    expect(await sumCostSince(metricsUserId, since30d, AGENT_ID)).toBe(0.03);
    expect(await sumTokensSince(metricsUserId, AGENT_ID, since30d)).toEqual({
      input: 1500,
      output: 2500,
    });

    const byAgent = await sumCostSinceByAgent(metricsUserId, since30d);
    expect(byAgent.get(AGENT_ID)).toBe(0.03);
    expect(byAgent.get(OTHER_AGENT_ID)).toBe(0.01);
  });

  it("excludes usage older than the window from every aggregate", async () => {
    await createUsageEvent({
      userId: metricsUserId,
      agentId: OTHER_AGENT_ID,
      source: "chat",
      provider: "anthropic",
      model: "claude-sonnet-5",
      inputTokens: 9999,
      outputTokens: 9999,
      costUsd: 99,
    });
    await prisma.usageEvent.updateMany({
      where: { userId: metricsUserId, agentId: OTHER_AGENT_ID, inputTokens: 9999 },
      data: { createdAt: fortyDaysAgo },
    });

    // Still just the in-window $0.01 from the previous test — the 40-day-old $99 never counts.
    expect(await sumCostSince(metricsUserId, since30d, OTHER_AGENT_ID)).toBe(0.01);
    expect(await sumTokensSince(metricsUserId, OTHER_AGENT_ID, since30d)).toEqual({
      input: 100,
      output: 100,
    });
  });

  it("returns null (not $0) when every priced event for an agent is outside the window", async () => {
    expect(await sumCostSince(metricsUserId, since30d, "no-usage-agent")).toBeNull();
  });
});
