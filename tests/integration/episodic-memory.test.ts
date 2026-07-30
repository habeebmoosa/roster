import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import {
  listEpisodicMemories,
  upsertEpisodicMemory,
} from "@/server/db/repositories/episodic-memory.repository";
import { upsertAgent } from "@/server/db/repositories/agent.repository";
import { prisma } from "@/server/db/prisma";

const AGENT_ID = "customer-support";
let userId: string;

beforeAll(async () => {
  await upsertAgent(loadAgentDefinitionFile(`agents/${AGENT_ID}/agent.yaml`));
  const user = await prisma.user.create({
    data: { email: `episodic-memory-${Date.now()}@test.local` },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.episodicMemory.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await prisma.$disconnect();
});

describe("episodic-memory repository", () => {
  it("returns nothing for a user/agent with no memories yet", async () => {
    expect(await listEpisodicMemories(userId, AGENT_ID)).toEqual([]);
  });

  it("stores and lists a memory", async () => {
    await upsertEpisodicMemory(userId, AGENT_ID, "preference:tone", "prefers short replies");
    const memories = await listEpisodicMemories(userId, AGENT_ID);
    expect(memories).toEqual([{ key: "preference:tone", value: "prefers short replies" }]);
  });

  it("upserting the same key updates the value rather than duplicating it", async () => {
    await upsertEpisodicMemory(userId, AGENT_ID, "preference:tone", "prefers detailed replies");
    const memories = await listEpisodicMemories(userId, AGENT_ID);
    expect(memories).toHaveLength(1);
    expect(memories[0]).toEqual({ key: "preference:tone", value: "prefers detailed replies" });
  });

  it("scopes memories per agent — a different agentId sees nothing", async () => {
    expect(await listEpisodicMemories(userId, "some-other-agent")).toEqual([]);
  });
});
