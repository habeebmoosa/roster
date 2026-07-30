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
}

const asStepEvents = (value: Prisma.JsonValue | null): WorkflowStepEvent[] | null =>
  Array.isArray(value) ? (value as unknown as WorkflowStepEvent[]) : null;

/** Every conversation for a user, across every agent — the History drawer's data, newest-first. */
export function listConversations(userId: string): Promise<ConversationSummary[]> {
  return prisma.conversation.findMany({
    where: { userId },
    select: { id: true, agentId: true, title: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
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
    messages: messages.map((m) => ({ ...m, stepEvents: asStepEvents(m.stepEvents) })),
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
      },
    }),
    prisma.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);
  return { ...message!, stepEvents: asStepEvents(message!.stepEvents) };
}
