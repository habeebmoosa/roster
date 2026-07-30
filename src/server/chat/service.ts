import { createUIMessageStream, type UIMessageChunk } from "ai";
import type { AgentMessage } from "@/core/agent";
import { ByokError, mapProviderError } from "@/core/providers";
import type { WorkflowStepEvent } from "@/core/workflow";
import { AgentNotFoundError, streamAgentChat } from "@/server/agents/service";
import { ANALYTICS_EVENTS } from "@/server/analytics/events";
import { logEvent } from "@/server/analytics/log-event";
import { getAgentDefinition } from "@/server/db/repositories/agent.repository";
import {
  appendMessage,
  createConversation,
  getConversationWithMessages,
  listConversations,
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
  /** A UI Message Stream (text-delta / data-stepEvent / error parts) — wrap in createUIMessageStreamResponse(). */
  stream: ReadableStream<UIMessageChunk>;
}

const TITLE_MAX_LENGTH = 60;
const ASSISTANT_TEXT_PART_ID = "assistant-text";

function deriveTitle(content: string): string {
  const trimmed = content.trim();
  return trimmed.length <= TITLE_MAX_LENGTH
    ? trimmed
    : `${trimmed.slice(0, TITLE_MAX_LENGTH - 1)}…`;
}

/**
 * Persists the user's turn, loads the conversation's real prior messages (the server
 * is the source of truth for history — the client only ever sends the newest message),
 * then returns a UI Message Stream: text deltas, `data-stepEvent` parts as Phase 8's
 * workflow fires them, and a structured `error` part on failure — never text spliced
 * into the reply (11.4). The assistant's full text + step events are persisted once
 * the stream finishes. Creates a new conversation when `conversationId` is omitted.
 *
 * Unknown-agent and unknown-conversation are both checked before any streaming
 * response is committed to (clean 404s from the route) — they're request-validity
 * issues, not turn-execution failures. Only failures that can only be discovered by
 * actually attempting the model call (bad/missing BYOK key, rate limit, quota) become
 * an in-stream `error` part, since by then the response has already started streaming.
 */
export async function sendChatMessage(input: SendChatMessageInput): Promise<SendChatMessageResult> {
  let conversationId = input.conversationId;
  let agentId = input.agentId;
  let priorMessages: AgentMessage[] = [];
  let isFirstEverConversation = false;

  if (conversationId) {
    const existing = await getConversationWithMessages(input.userId, conversationId);
    if (!existing) throw new ConversationNotFoundError(conversationId);
    // The conversation's own agent, not necessarily whatever the caller happened to pass.
    agentId = existing.agentId;
    priorMessages = existing.messages.map((m) => ({
      role: m.role as AgentMessage["role"],
      content: m.content,
    }));
  } else {
    if (!(await getAgentDefinition(agentId))) throw new AgentNotFoundError(agentId);
    // Checked before creating the new conversation below, so it never sees itself.
    isFirstEverConversation = (await listConversations(input.userId)).length === 0;
    const created = await createConversation(input.userId, agentId, deriveTitle(input.content));
    conversationId = created.id;
  }

  await appendMessage({ conversationId, role: "user", content: input.content });
  if (isFirstEverConversation) {
    await logEvent({ userId: input.userId, event: ANALYTICS_EVENTS.FIRST_CHAT_MESSAGE_SENT });
  }

  const messages: AgentMessage[] = [...priorMessages, { role: "user", content: input.content }];
  const finalConversationId = conversationId;
  const finalAgentId = agentId;

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });

      const stepEvents: WorkflowStepEvent[] = [];
      let assistantText = "";
      let textStarted = false;

      try {
        const result = await streamAgentChat({
          userId: input.userId,
          agentId: finalAgentId,
          provider: input.provider,
          model: input.model,
          messages,
          onStepEvent: (event) => {
            stepEvents.push(event);
            writer.write({ type: "data-stepEvent", data: event });
          },
        });

        for await (const chunk of result.textStream) {
          if (!textStarted) {
            writer.write({ type: "text-start", id: ASSISTANT_TEXT_PART_ID });
            textStarted = true;
          }
          assistantText += chunk;
          writer.write({ type: "text-delta", id: ASSISTANT_TEXT_PART_ID, delta: chunk });
        }
        if (textStarted) writer.write({ type: "text-end", id: ASSISTANT_TEXT_PART_ID });
      } catch (err) {
        if (textStarted) writer.write({ type: "text-end", id: ASSISTANT_TEXT_PART_ID });
        const message = (err instanceof ByokError ? err : mapProviderError(err)).userMessage;
        writer.write({ type: "error", errorText: message });
      }

      if (assistantText) {
        await appendMessage({
          conversationId: finalConversationId,
          role: "assistant",
          content: assistantText,
          stepEvents: stepEvents.length > 0 ? stepEvents : undefined,
        }).catch((err: unknown) => {
          console.error(
            `Failed to persist assistant message for conversation ${finalConversationId}:`,
            err,
          );
        });
      }

      writer.write({ type: "finish" });
    },
    onError: (error) => {
      console.error("Unhandled chat stream error:", error);
      return "Something went wrong.";
    },
  });

  return { conversationId, stream };
}
