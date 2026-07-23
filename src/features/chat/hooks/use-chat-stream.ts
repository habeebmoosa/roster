"use client";

import { useState } from "react";
import type { ChatMessage } from "../types";

export interface UseChatStreamOptions {
  agentId: string;
  provider: string;
  model: string;
}

/** Drives /api/chat: optimistic user turn, streamed assistant turn, error recovery. */
export function useChatStream({ agentId, provider, model }: UseChatStreamOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  function appendToLastAssistant(chunk: string) {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last) copy[copy.length - 1] = { role: "assistant", content: last.content + chunk };
      return copy;
    });
  }

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || running) return;

    const history = [...messages, { role: "user", content: trimmed } satisfies ChatMessage];
    setMessages([...history, { role: "assistant", content: "" }]);
    setError("");
    setRunning(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, provider, model, messages: history }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "Request failed.");
        setMessages((prev) => prev.slice(0, -1)); // drop the empty assistant turn
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        appendToLastAssistant(decoder.decode(value, { stream: true }));
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
  }

  return { messages, running, error, send, clear };
}
