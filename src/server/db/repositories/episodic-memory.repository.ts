import { prisma } from "@/server/db/prisma";

export interface EpisodicMemoryRecord {
  key: string;
  value: string;
}

export function listEpisodicMemories(
  userId: string,
  agentId: string,
): Promise<EpisodicMemoryRecord[]> {
  return prisma.episodicMemory.findMany({
    where: { userId, agentId },
    select: { key: true, value: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function upsertEpisodicMemory(
  userId: string,
  agentId: string,
  key: string,
  value: string,
): Promise<void> {
  await prisma.episodicMemory.upsert({
    where: { userId_agentId_key: { userId, agentId, key } },
    create: { userId, agentId, key, value },
    update: { value },
  });
}
