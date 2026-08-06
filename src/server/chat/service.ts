import { createUIMessageStream, toUIMessageStream, type UIMessageChunk } from "ai";
import { MessagePartsAccumulator, type AgentMessage, type MessagePart } from "@/core/agent";
import { ByokError, mapProviderError } from "@/core/providers";
import type { WorkflowStepEvent } from "@/core/workflow";
import { AgentNotFoundError, AgentPausedError, streamAgentChat } from "@/server/agents/service";
import { ANALYTICS_EVENTS } from "@/server/analytics/events";
import { logEvent } from "@/server/analytics/log-event";
import { logUsageEvent } from "@/server/analytics/usage";
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
      let parts: MessagePart[] = [];
      let result: Awaited<ReturnType<typeof streamAgentChat>> | undefined;

      function mapError(err: unknown): string {
        if (err instanceof AgentPausedError) return "This employee is paused. Resume it to continue.";
        return (err instanceof ByokError ? err : mapProviderError(err)).userMessage;
      }

      try {
        result = await streamAgentChat({
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

        if (result.fullStream) {
          // The bypass (single-step) path — real token-by-token streaming,
          // with reasoning + tool-call visibility. toUIMessageStream() never
          // rethrows a mid-stream provider error; it converts it into an
          // in-band `error` chunk via `onError` below, so this loop always
          // completes normally.
          const accumulator = new MessagePartsAccumulator();
          const reader = toUIMessageStream({
            stream: result.fullStream,
            sendReasoning: true,
            sendStart: false,
            sendFinish: false,
            onError: mapError,
          }).getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            writer.write(value);
            accumulator.apply(value);
          }
          parts = accumulator.parts;
          assistantText = parts
            .filter((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text")
            .map((p) => p.text)
            .join("");
        } else {
          // The multi-step workflow path — already-validated final text,
          // never streamed live (Phase 8). Wrapped as a single text part so
          // the client's rendering model stays uniform either way.
          for await (const chunk of result.textStream) {
            if (!textStarted) {
              writer.write({ type: "text-start", id: ASSISTANT_TEXT_PART_ID });
              textStarted = true;
            }
            assistantText += chunk;
            writer.write({ type: "text-delta", id: ASSISTANT_TEXT_PART_ID, delta: chunk });
          }
          if (textStarted) writer.write({ type: "text-end", id: ASSISTANT_TEXT_PART_ID });
          if (assistantText) parts = [{ type: "text", text: assistantText }];
        }
      } catch (err) {
        if (textStarted) writer.write({ type: "text-end", id: ASSISTANT_TEXT_PART_ID });
        writer.write({ type: "error", errorText: mapError(err) });
      }

      if (assistantText) {
        await appendMessage({
          conversationId: finalConversationId,
          role: "assistant",
          content: assistantText,
          stepEvents: stepEvents.length > 0 ? stepEvents : undefined,
          parts: parts.length > 0 ? parts : undefined,
        }).catch((err: unknown) => {
          console.error(
            `Failed to persist assistant message for conversation ${finalConversationId}:`,
            err,
          );
        });
      }

      // Best-effort — real cost was incurred whether or not the turn
      // produced any text (e.g. a tool call followed by a provider error),
      // and a usage-tracking failure must never surface as a chat error.
      if (result) {
        try {
          const usage = await result.usage;
          await logUsageEvent({
            userId: input.userId,
            agentId: finalAgentId,
            conversationId: finalConversationId,
            source: "chat",
            provider: input.provider,
            model: input.model,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          });
        } catch (err) {
          console.error(`Failed to capture usage for conversation ${finalConversationId}:`, err);
        }
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
