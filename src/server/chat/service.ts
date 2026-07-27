import type { AgentMessage } from "@/core/agent";
import { streamAgentChat } from "@/server/agents/service";
import {
  appendMessage,
  createConversation,
  getConversationWithMessages,
} from "@/server/db/repositories/conversation.repository";

export class ConversationNotFoundError extends Error {
  constructor(conversationId: string) {
    super(`Conversation not found: ${conversationId}`);
    this.name = "ConversationNotFoundError";
  }
}

export interface SendChatMessageInput {
  userId: string;
  agentId: string;
  /** Omit to start a new conversation. */
  conversationId?: string;
  provider: string;
  model: string;
  /** The new user turn only — prior turns are loaded from the DB, never resent by the client. */
  content: string;
}

export interface SendChatMessageResult {
  conversationId: string;
  textStream: AsyncIterable<string>;
  text: Promise<string>;
  usage: StreamAgentChatUsage;
}

type StreamAgentChatUsage = Awaited<ReturnType<typeof streamAgentChat>>["usage"];

const TITLE_MAX_LENGTH = 60;

function deriveTitle(content: string): string {
  const trimmed = content.trim();
  return trimmed.length <= TITLE_MAX_LENGTH
    ? trimmed
    : `${trimmed.slice(0, TITLE_MAX_LENGTH - 1)}…`;
}

/**
 * Persists the user's turn, loads the conversation's real prior messages (the server
 * is the source of truth for history — the client only ever sends the newest message),
 * streams the reply through streamAgentChat(), and persists the assistant's full text
 * once the stream finishes. Creates a new conversation when `conversationId` is omitted.
 */
export async function sendChatMessage(input: SendChatMessageInput): Promise<SendChatMessageResult> {
  let conversationId = input.conversationId;
  let priorMessages: AgentMessage[] = [];

  if (conversationId) {
    const existing = await getConversationWithMessages(input.userId, conversationId);
    if (!existing) throw new ConversationNotFoundError(conversationId);
    priorMessages = existing.messages.map((m) => ({
      role: m.role as AgentMessage["role"],
      content: m.content,
    }));
  } else {
    const created = await createConversation(
      input.userId,
      input.agentId,
      deriveTitle(input.content),
    );
    conversationId = created.id;
  }

  await appendMessage({ conversationId, role: "user", content: input.content });

  const messages: AgentMessage[] = [...priorMessages, { role: "user", content: input.content }];

  const result = await streamAgentChat({
    userId: input.userId,
    agentId: input.agentId,
    provider: input.provider,
    model: input.model,
    messages,
  });

  const finalConversationId = conversationId;
  async function* persistingStream(): AsyncGenerator<string> {
    let full = "";
    try {
      for await (const chunk of result.textStream) {
        full += chunk;
        yield chunk;
      }
    } finally {
      if (full) {
        await appendMessage({
          conversationId: finalConversationId,
          role: "assistant",
          content: full,
        }).catch((err: unknown) => {
          console.error(
            `Failed to persist assistant message for conversation ${finalConversationId}:`,
            err,
          );
        });
      }
    }
  }

  return {
    conversationId,
    textStream: persistingStream(),
    text: result.text,
    usage: result.usage,
  };
}
