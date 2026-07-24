"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
// Pure data only — safe to import into a client bundle (no AI SDK / server code).
import { getProviderCatalog } from "@/core/providers/catalog";
import { Button, Card, CardDescription, CardTitle, Input, Select } from "@/ui";

export function AddProviderForm() {
  const catalog = useMemo(() => getProviderCatalog(), []);
  const router = useRouter();

  const [provider, setProvider] = useState(catalog[0]?.id ?? "");
  const entry = catalog.find((c) => c.id === provider);

  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(catalog[0]?.suggestedModels[0] ?? "");
  const [baseUrl, setBaseUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  function onProviderChange(id: string) {
    setProvider(id);
    const next = catalog.find((c) => c.id === id);
    setModel(next?.suggestedModels[0] ?? "");
    setBaseUrl("");
    setStatus("idle");
    setMessage("");
  }

  const showBaseUrl = Boolean(entry?.baseUrlEditable || entry?.requiresBaseUrl);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, model, baseUrl: baseUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error?.message ?? "Failed to add provider.");
        return;
      }
      setStatus("ok");
      setMessage("Validated and saved.");
      setApiKey("");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <Card>
      <CardTitle>Add a provider</CardTitle>
      <CardDescription>
        We validate the key with a 1-token request before saving. Keys are encrypted at rest.
      </CardDescription>

      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">Provider</span>
          <Select value={provider} onChange={(e) => onProviderChange(e.target.value)}>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">API key</span>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-…"
            autoComplete="off"
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">Model (used to validate)</span>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. gpt-4o-mini"
            list="suggested-models"
            required
          />
          <datalist id="suggested-models">
            {entry?.suggestedModels.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>

        {showBaseUrl ? (
          <label className="grid gap-1 text-sm">
            <span className="text-text font-medium">
              Base URL {entry?.requiresBaseUrl ? "(required)" : "(optional)"}
            </span>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={entry?.defaultBaseUrl ?? "https://api.example.com/v1"}
              required={entry?.requiresBaseUrl}
            />
          </label>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Validating…" : "Validate & save"}
          </Button>
          {message ? (
            <span
              className={status === "error" ? "text-danger text-sm" : "text-success text-sm"}
              role="status"
            >
              {message}
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
