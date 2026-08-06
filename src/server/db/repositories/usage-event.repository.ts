import { prisma } from "@/server/db/prisma";

export interface CreateUsageEventInput {
  userId: string;
  agentId: string;
  /** Null for REST-sourced usage — server/rest/chat-stream.ts never creates a Conversation. */
  conversationId?: string | null;
  source: "chat" | "rest";
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Null when the model has no known pricing in ModelCatalog — never guessed. */
  costUsd: number | null;
}

export async function createUsageEvent(input: CreateUsageEventInput): Promise<void> {
  await prisma.usageEvent.create({
    data: {
      userId: input.userId,
      agentId: input.agentId,
      conversationId: input.conversationId ?? null,
      source: input.source,
      provider: input.provider,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      costUsd: input.costUsd,
    },
  });
}

export interface UsageEventRecord {
  id: string;
  userId: string;
  agentId: string;
  conversationId: string | null;
  source: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  createdAt: Date;
}

/** All usage events recorded for a user, newest first — used by tests and any future usage-detail view. */
export function listUsageEventsForUser(userId: string): Promise<UsageEventRecord[]> {
  return prisma.usageEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/** Total real cost recorded since a date — null when nothing priced landed in the window (no usage at all, or only uncatalogued-model usage), never coerced to 0, so "no data" and "genuinely $0" stay distinguishable. Optionally scoped to one agent. */
export async function sumCostSince(
  userId: string,
  since: Date,
  agentId?: string,
): Promise<number | null> {
  const result = await prisma.usageEvent.aggregate({
    where: {
      userId,
      createdAt: { gte: since },
      costUsd: { not: null },
      ...(agentId ? { agentId } : {}),
    },
    _sum: { costUsd: true },
  });
  return result._sum.costUsd;
}

/** Total real cost since a date, per agent — one query for every row of a workers list/dashboard preview. Agents with no priced usage in the window are simply absent from the map. */
export async function sumCostSinceByAgent(userId: string, since: Date): Promise<Map<string, number>> {
  const rows = await prisma.usageEvent.groupBy({
    by: ["agentId"],
    where: { userId, createdAt: { gte: since }, costUsd: { not: null } },
    _sum: { costUsd: true },
  });
  return new Map(rows.map((r) => [r.agentId, r._sum.costUsd ?? 0]));
}

/** Total input/output tokens recorded since a date, for one agent — real regardless of whether the model is priced (unlike cost, token counts never need a pricing lookup). */
export async function sumTokensSince(
  userId: string,
  agentId: string,
  since: Date,
): Promise<{ input: number; output: number }> {
  const result = await prisma.usageEvent.aggregate({
    where: { userId, agentId, createdAt: { gte: since } },
    _sum: { inputTokens: true, outputTokens: true },
  });
  return { input: result._sum.inputTokens ?? 0, output: result._sum.outputTokens ?? 0 };
}
