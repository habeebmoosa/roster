"use client";

import { useState, type FormEvent } from "react";
import { getProvider } from "@/core/providers/catalog";
import { Button, Input, Select, Textarea } from "@/ui";

export function ChatComposer({
  provider,
  model,
  configured,
  onProviderChange,
  onModelChange,
  onSend,
  running,
  error,
}: {
  provider: string;
  model: string;
  configured: string[];
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onSend: (content: string) => void;
  running: boolean;
  error: string;
}) {
  const [input, setInput] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select
          aria-label="Provider"
          value={provider}
          onChange={(e) => onProviderChange(e.target.value)}
          className="max-w-40"
        >
          {configured.map((id) => (
            <option key={id} value={id}>
              {getProvider(id)?.label ?? id}
            </option>
          ))}
        </Select>
        <Input
          aria-label="Model"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="max-w-48 font-mono text-xs"
        />
        {error ? (
          <span className="text-danger text-sm" role="status">
            {error}
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message the employee…"
          className="min-h-16"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button type="submit" disabled={running || !input.trim()} data-testid="send">
          {running ? "Streaming…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
