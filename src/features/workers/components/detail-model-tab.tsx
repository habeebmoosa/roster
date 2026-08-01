"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getProvider, getProviderCatalog } from "@/core/providers/catalog";
import { useModelOptions } from "@/hooks/use-model-options";
import { toast } from "@/hooks/use-toast";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { Badge, Button, Card, CardTitle, Input, Select } from "@/ui";

export interface DetailModelTabProps {
  agentId: string;
  /**
   * The real, persisted default — null until someone (hire wizard or this
   * tab) sets one. Drives both the read-only display and the editor's
   * initial values. Deliberately has no realistic-looking placeholder for
   * the null case — that would be indistinguishable from an actually
   * configured default (see LLM_PROVIDER_MVP_PLAN.md follow-up notes).
   */
  currentModel: { provider: string; model: string } | null;
  /** The signed-in user's connected providers — only these are selectable. */
  providerKeys: ProviderKeyRecord[];
}

function initialProviderFor(currentModel: DetailModelTabProps["currentModel"], providerKeys: ProviderKeyRecord[]): string {
  return currentModel?.provider ?? providerKeys[0]?.provider ?? "";
}

// When nothing's configured yet, defaulting the model to "" would leave the
// Select's React state out of sync with what the browser actually shows
// selected (its first real <option>) — so a Save without ever touching the
// dropdown would silently submit an empty model. Seed it for real instead.
function initialModelFor(currentModel: DetailModelTabProps["currentModel"], provider: string): string {
  return currentModel?.model ?? getProvider(provider)?.suggestedModels[0] ?? "";
}

export function DetailModelTab({ agentId, currentModel, providerKeys }: DetailModelTabProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [provider, setProvider] = useState(() => initialProviderFor(currentModel, providerKeys));
  const [model, setModel] = useState(() => initialModelFor(currentModel, initialProviderFor(currentModel, providerKeys)));
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const connectedBaseUrl = providerKeys.find((k) => k.provider === provider)?.baseUrl ?? undefined;
  const { options: modelOptions } = useModelOptions(
    editing ? provider : "",
    provider === "ollama" ? connectedBaseUrl : undefined,
  );
  const catalogEntry = getProvider(provider);
  // Real, live list when the catalog/introspection has one — a genuine
  // dropdown. Only providers with neither (a bare custom endpoint, or Ollama
  // before any model has been pulled) fall back to free text.
  const listedModels = modelOptions.length > 0 ? modelOptions.map((o) => o.modelId) : (catalogEntry?.suggestedModels ?? []);

  function resetToCurrent() {
    const resetProvider = initialProviderFor(currentModel, providerKeys);
    setProvider(resetProvider);
    setModel(initialModelFor(currentModel, resetProvider));
    setMessage("");
  }

  async function onSave() {
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch(`/api/agents/${agentId}/model`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model: model.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error?.message ?? "Something went wrong.");
        return;
      }
      toast({ title: "Model updated", variant: "success" });
      setEditing(false);
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    } finally {
      setStatus("idle");
    }
  }

  if (providerKeys.length === 0) {
    return (
      <Card>
        <CardTitle>Model</CardTitle>
        <p className="text-text-muted mt-3 text-sm">
          Connect a provider before configuring which model this employee uses.
        </p>
        <Link
          href="/settings?tab=providers"
          className="text-accent mt-2 inline-block text-sm font-medium hover:underline"
        >
          Connect a provider →
        </Link>
      </Card>
    );
  }

  if (!editing) {
    const providerLabel = currentModel
      ? (getProvider(currentModel.provider)?.label ?? currentModel.provider)
      : null;
    return (
      <Card>
        <CardTitle>Model</CardTitle>
        <div className="mt-3 flex items-center justify-between gap-4">
          {currentModel ? (
            <div>
              <div className="flex items-center gap-2">
                <p className="text-text text-sm font-semibold">{providerLabel}</p>
                <Badge variant="neutral">Connected</Badge>
              </div>
              <p className="text-text-muted mt-1 font-mono text-sm">{currentModel.model}</p>
            </div>
          ) : (
            <p className="text-text-muted text-sm">
              No default model configured — falls back to whatever the caller specifies.
            </p>
          )}
          <Button variant="secondary" onClick={() => setEditing(true)}>
            {currentModel ? "Change model" : "Set a model"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Model</CardTitle>
      <p className="text-text-muted mt-1 text-sm">
        Used whenever this employee is accessed via the API without an explicit override.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">Provider</span>
          <Select
            value={provider}
            onChange={(e) => {
              const nextEntry = getProvider(e.target.value);
              setProvider(e.target.value);
              setModel(nextEntry?.suggestedModels[0] ?? "");
            }}
          >
            {providerKeys.map((key) => {
              const entry = getProviderCatalog().find((c) => c.id === key.provider);
              return (
                <option key={key.id} value={key.provider}>
                  {entry?.label ?? key.provider}
                </option>
              );
            })}
          </Select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">Model</span>
          {listedModels.length > 0 ? (
            <Select value={model} onChange={(e) => setModel(e.target.value)}>
              {model && !listedModels.includes(model) ? <option value={model}>{model}</option> : null}
              {listedModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-4o-mini"
            />
          )}
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={onSave} disabled={status === "saving" || !model.trim()}>
          {status === "saving" ? "Saving…" : "Save"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setEditing(false);
            resetToCurrent();
          }}
        >
          Cancel
        </Button>
        {message ? (
          <span className="text-danger text-sm" role="status">
            {message}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
