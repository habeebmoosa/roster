"use client";

import { useState } from "react";
import { getProvider } from "@/core/providers/catalog";
import { Button, Card, Input } from "@/ui";

interface AgentOption {
  id: string;
  name: string;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function Playground({
  agents,
  configured,
}: {
  agents: AgentOption[];
  configured: string[];
}) {
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [provider, setProvider] = useState(configured[0] ?? "");
  const [model, setModel] = useState(getProvider(configured[0] ?? "")?.suggestedModels[0] ?? "");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  function onProviderChange(id: string) {
    setProvider(id);
    setModel(getProvider(id)?.suggestedModels[0] ?? "");
  }

  function appendToLastAssistant(chunk: string) {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last) copy[copy.length - 1] = { role: "assistant", content: last.content + chunk };
      return copy;
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;

    const history = [...messages, { role: "user", content } satisfies Msg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError("");
    setRunning(true);

    try {
      const res = await fetch("/api/playground", {
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

  return (
    <div className="grid gap-4">
      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Employee</span>
            <select
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Provider</span>
            <select
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              value={provider}
              onChange={(e) => onProviderChange(e.target.value)}
            >
              {configured.map((id) => (
                <option key={id} value={id}>
                  {getProvider(id)?.label ?? id}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Model</span>
            <Input value={model} onChange={(e) => setModel(e.target.value)} required />
          </label>
        </div>
      </Card>

      {messages.length > 0 ? (
        <Card>
          <div className="grid gap-4">
            {messages.map((m, i) => (
              <div key={i}>
                <p className="mb-1 text-xs font-medium tracking-wide text-neutral-500 uppercase">
                  {m.role === "user"
                    ? "You"
                    : (agents.find((a) => a.id === agentId)?.name ?? "Agent")}
                </p>
                <p className="text-sm whitespace-pre-wrap text-neutral-900">
                  {m.content || (running ? "…" : "")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <form onSubmit={send} className="grid gap-3">
          <textarea
            className="min-h-24 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message the employee…"
            required
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={running || !input.trim()} data-testid="send">
              {running ? "Streaming…" : "Send"}
            </Button>
            {messages.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMessages([]);
                  setError("");
                }}
              >
                Clear
              </Button>
            ) : null}
            {error ? (
              <span className="text-sm text-red-600" role="status">
                {error}
              </span>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
