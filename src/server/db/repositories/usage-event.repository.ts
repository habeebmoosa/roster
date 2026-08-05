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
