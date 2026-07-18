"use client";

import { useState } from "react";
import { getProvider } from "@/core/providers/catalog";
import { Button, Card, Input } from "@/ui";

export function Playground({ configured }: { configured: string[] }) {
  const [provider, setProvider] = useState(configured[0] ?? "");
  const [model, setModel] = useState(getProvider(configured[0] ?? "")?.suggestedModels[0] ?? "");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  function onProviderChange(id: string) {
    setProvider(id);
    setModel(getProvider(id)?.suggestedModels[0] ?? "");
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setRunning(true);
    setError("");
    setOutput("");
    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, prompt }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "Request failed.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch {
      setError("Network error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <form onSubmit={run} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
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

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Prompt</span>
            <textarea
              className="min-h-24 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything…"
              required
            />
          </label>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={running || !prompt.trim()} data-testid="run">
              {running ? "Streaming…" : "Run"}
            </Button>
            {error ? (
              <span className="text-sm text-red-600" role="status">
                {error}
              </span>
            ) : null}
          </div>
        </form>
      </Card>

      {output ? (
        <Card>
          <p className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
            Output
          </p>
          <pre className="text-sm whitespace-pre-wrap text-neutral-900" data-testid="output">
            {output}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
