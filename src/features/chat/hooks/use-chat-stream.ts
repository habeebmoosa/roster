"use client";

import { parseJsonEventStream, type UIMessageChunk } from "ai";
import { useState } from "react";
import { z } from "zod";
import { MessagePartsAccumulator } from "@/core/agent";
import type { WorkflowStepEvent } from "@/core/workflow";
import type { ChatMessage } from "../types";

export interface UseChatStreamOptions {
  agentId: string;
  provider: string;
  model: string;
}

/** Loose shape shared by every chunk in the UI Message Stream — enough to route on `type`, without re-declaring the SDK's full discriminated union. */
const chunkSchema = z.object({ type: z.string() }).passthrough();

/** Chunk types that feed the ordered parts[] model — text/reasoning/tool-call blocks. Everything else (start, finish, data-stepEvent, error) is handled separately or ignored. */
const PART_CHUNK_TYPES = new Set([
  "text-start",
  "text-delta",
  "text-end",
  "reasoning-start",
  "reasoning-delta",
  "reasoning-end",
  "tool-input-start",
  "tool-input-delta",
  "tool-input-available",
  "tool-input-error",
  "tool-output-available",
  "tool-output-error",
]);

/**
 * Drives /api/chat: optimistic user turn, streamed assistant turn (text, live
 * step events, and structured errors — 11.4), error recovery. The server owns
 * conversation history (11.2) — only the new message is ever sent;
 * `conversationId` is created on the first turn and reused for every turn
 * after, read back from the response's `X-Conversation-Id` header.
 */
export function useChatStream({ agentId, provider, model }: UseChatStreamOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  function updateLastAssistant(updater: (message: ChatMessage) => ChatMessage) {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last) copy[copy.length - 1] = updater(last);
      return copy;
    });
  }

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || running) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "" },
    ]);
    setError("");
    setRunning(true);

    const accumulator = new MessagePartsAccumulator();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, provider, model, conversationId, content: trimmed }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "Request failed.");
        setMessages((prev) => prev.slice(0, -1)); // drop the empty assistant turn
        return;
      }
      const newConversationId = res.headers.get("X-Conversation-Id");
      if (newConversationId) setConversationId(newConversationId);

      const reader = parseJsonEventStream({ stream: res.body, schema: chunkSchema }).getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value.success) continue; // skip a malformed frame rather than aborting the whole turn

        const chunk = value.value as UIMessageChunk;
        if (chunk.type === "data-stepEvent" && chunk.data) {
          const event = chunk.data as WorkflowStepEvent;
          updateLastAssistant((m) => ({ ...m, stepEvents: [...(m.stepEvents ?? []), event] }));
          continue;
        }
        if (chunk.type === "error" && typeof chunk.errorText === "string") {
          const errorText = chunk.errorText;
          updateLastAssistant((m) => ({ ...m, error: errorText }));
          continue;
        }

        if (!PART_CHUNK_TYPES.has(chunk.type)) continue;

        // Builds the ordered parts[] — `content` stays a plain-text mirror of
        // just the text deltas, for anything still reading it directly.
        accumulator.apply(chunk);
        const delta = chunk.type === "text-delta" && typeof chunk.delta === "string" ? chunk.delta : "";
        const parts = [...accumulator.parts];
        updateLastAssistant((m) => ({ ...m, content: m.content + delta, parts }));
      }
    } catch {
      setError("Network error.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setRunning(false);
    }
  }

  function clear() {
    setMessages([]);
    setError("");
    setConversationId(undefined);
  }

  /** Loads an existing conversation (History drawer selection, 11.3) — its messages become the thread, and its id is reused for the next send(). */
  function loadConversation(id: string, loadedMessages: ChatMessage[]) {
    setMessages(loadedMessages);
    setConversationId(id);
    setError("");
  }

  return { messages, running, error, send, clear, loadConversation, conversationId };
}
