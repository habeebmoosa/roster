"use client";

import { useState, type FormEvent } from "react";
import { getProvider } from "@/core/providers/catalog";
import { useModelOptions } from "@/hooks/use-model-options";
import { cn } from "@/lib/cn";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconChevronDown,
  IconPlus,
  IconSend,
  Textarea,
  Tooltip,
} from "@/ui";

/** One provider's group inside the model picker — its own label header + model rows, fetched only once the picker is actually open (DropdownMenuContent doesn't mount its children until then). */
function ModelPickerSection({
  providerId,
  baseUrl,
  currentProvider,
  currentModel,
  onSelect,
}: {
  providerId: string;
  baseUrl: string | null;
  currentProvider: string;
  currentModel: string;
  onSelect: (provider: string, model: string) => void;
}) {
  const catalogEntry = getProvider(providerId);
  const { options, loading } = useModelOptions(
    providerId,
    providerId === "ollama" ? (baseUrl ?? undefined) : undefined,
  );
  const models = options.length > 0 ? options.map((o) => o.modelId) : (catalogEntry?.suggestedModels ?? []);

  return (
    <div>
      <p className="text-text-faint px-2.5 py-1.5 text-xs font-medium tracking-wide uppercase">
        {catalogEntry?.label ?? providerId}
      </p>
      {loading ? (
        <p className="text-text-faint px-2.5 py-1.5 text-sm">Loading models…</p>
      ) : models.length === 0 ? (
        <p className="text-text-faint px-2.5 py-1.5 text-sm">No models found</p>
      ) : (
        models.map((modelId) => (
          <DropdownMenuItem
            key={modelId}
            onSelect={() => onSelect(providerId, modelId)}
            className={cn(
              "font-mono text-xs",
              providerId === currentProvider && modelId === currentModel && "bg-bg-subtle",
            )}
          >
            <span className="truncate">{modelId}</span>
          </DropdownMenuItem>
        ))
      )}
    </div>
  );
}

export function ChatComposer({
  provider,
  model,
  providerKeys,
  onModelSelect,
  onSend,
  running,
  error,
}: {
  provider: string;
  model: string;
  providerKeys: ProviderKeyRecord[];
  onModelSelect: (provider: string, model: string) => void;
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
    <form onSubmit={handleSubmit} className="border-border bg-bg-elevated rounded-2xl border shadow-sm">
      <Textarea
        unstyled
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Describe a task or ask a question"
        className="min-h-16 px-4 pt-4"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />

      <div className="flex items-center justify-between gap-2 px-3 pb-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Add attachments or tools"
            className="text-text-muted hover:bg-bg-subtle hover:text-text flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          >
            <IconPlus className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            {/* Not wired up yet — structure only, functionality lands later. */}
            <DropdownMenuItem disabled title="Coming soon">
              Add files
            </DropdownMenuItem>
            <DropdownMenuItem disabled title="Coming soon">
              Web search
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          {error ? (
            <span className="text-danger text-sm" role="status">
              {error}
            </span>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Select model"
              className="border-border bg-bg text-text hover:bg-bg-subtle flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              <span className="max-w-32 truncate font-mono">{model || "Select model"}</span>
              <IconChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="max-h-80 w-64 overflow-y-auto">
              {providerKeys.map((key) => (
                <ModelPickerSection
                  key={key.provider}
                  providerId={key.provider}
                  baseUrl={key.baseUrl}
                  currentProvider={provider}
                  currentModel={model}
                  onSelect={onModelSelect}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip label={running ? "Streaming…" : "Send message"}>
            <button
              type="submit"
              disabled={running || !input.trim()}
              data-testid="send"
              aria-label={running ? "Streaming" : "Send message"}
              className="bg-accent text-accent-contrast flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconSend className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </form>
  );
}
