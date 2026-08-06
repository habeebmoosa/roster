import type { MessagePart } from "@/core/agent";
import type { WorkflowStepEvent } from "@/core/workflow";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/server/db/prisma";

export interface ConversationSummary {
  id: string;
  agentId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecord {
  id: string;
  role: string; // "user" | "assistant"
  content: string;
  /** Only ever present on an assistant turn that took the multi-step workflow path (Phase 8) — most turns have none. */
  stepEvents: WorkflowStepEvent[] | null;
  /** Ordered text/reasoning/tool-call blocks for reload rendering — null on messages that predate this column (11.x follow-up) or on user turns; the client falls back to rendering `content` as a single text part. */
  parts: MessagePart[] | null;
  createdAt: Date;
}

export interface ConversationWithMessages extends ConversationSummary {
  messages: MessageRecord[];
}

export interface AppendMessageInput {
  conversationId: string;
  role: string;
  content: string;
  stepEvents?: WorkflowStepEvent[] | null;
  parts?: MessagePart[] | null;
}

const asStepEvents = (value: Prisma.JsonValue | null): WorkflowStepEvent[] | null =>
  Array.isArray(value) ? (value as unknown as WorkflowStepEvent[]) : null;

const asMessageParts = (value: Prisma.JsonValue | null): MessagePart[] | null =>
  Array.isArray(value) ? (value as unknown as MessagePart[]) : null;

/** Every conversation for a user, across every agent — the History drawer's data, newest-first. */
export function listConversations(userId: string): Promise<ConversationSummary[]> {
  return prisma.conversation.findMany({
    where: { userId },
    select: { id: true, agentId: true, title: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

/** Conversations started since a given date, for one agent — the worker detail page's "Conversations" stat. */
export function countConversationsSince(
  userId: string,
  agentId: string,
  since: Date,
): Promise<number> {
  return prisma.conversation.count({ where: { userId, agentId, createdAt: { gte: since } } });
}

/** Conversations started since a given date, per agent, for a user — one query for every row of a workers list/dashboard preview. Agents with none in the window are simply absent from the map. */
export async function countConversationsSinceByAgent(
  userId: string,
  since: Date,
): Promise<Map<string, number>> {
  const rows = await prisma.conversation.groupBy({
    by: ["agentId"],
    where: { userId, createdAt: { gte: since } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.agentId, r._count._all]));
}

/** Most recent conversation activity (updatedAt) per agent, for a user. Agents with no conversations at all are absent from the map. */
export async function getLastActivityByAgent(userId: string): Promise<Map<string, Date>> {
  const rows = await prisma.conversation.groupBy({
    by: ["agentId"],
    where: { userId },
    _max: { updatedAt: true },
  });
  const entries: [string, Date][] = [];
  for (const row of rows) {
    if (row._max.updatedAt) entries.push([row.agentId, row._max.updatedAt]);
  }
  return new Map(entries);
}

/** A single conversation with its full message history, in order — null if it doesn't exist or belongs to a different user. */
export async function getConversationWithMessages(
  userId: string,
  conversationId: string,
): Promise<ConversationWithMessages | null> {
  const row = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) return null;
  const { messages, ...conversation } = row;
  return {
    ...conversation,
    messages: messages.map((m) => ({
      ...m,
      stepEvents: asStepEvents(m.stepEvents),
      parts: asMessageParts(m.parts),
    })),
  };
}

export function createConversation(
  userId: string,
  agentId: string,
  title?: string | null,
): Promise<ConversationSummary> {
  return prisma.conversation.create({
    data: { userId, agentId, title: title ?? null },
    select: { id: true, agentId: true, title: true, createdAt: true, updatedAt: true },
  });
}

/** Appends a message and bumps the conversation's `updatedAt` (for History-drawer recency ordering) in one transaction. */
export async function appendMessage(input: AppendMessageInput): Promise<MessageRecord> {
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        stepEvents: (input.stepEvents ?? undefined) as Prisma.InputJsonValue | undefined,
        parts: (input.parts ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    }),
    prisma.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);
  return {
    ...message!,
    stepEvents: asStepEvents(message!.stepEvents),
    parts: asMessageParts(message!.parts),
  };
}
