"use client";

// Pure data only — safe to import into a client bundle (no AI SDK / server code).
import { getProvider, getProviderCatalog } from "@/core/providers/catalog";
import { AddProviderForm } from "@/features/providers";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { CardDescription, CardTitle, Input, Select } from "@/ui";

export function StepModel({
  providerKeys,
  provider,
  model,
  onChange,
}: {
  providerKeys: ProviderKeyRecord[];
  provider: string;
  model: string;
  onChange: (fields: { provider?: string; model?: string }) => void;
}) {
  if (providerKeys.length === 0) {
    return (
      <div>
        <CardTitle>Provider & model</CardTitle>
        <CardDescription>
          Connect a provider to continue — no need to leave this wizard.
        </CardDescription>
        <div className="mt-4">
          <AddProviderForm embedded />
        </div>
      </div>
    );
  }

  const catalogEntry = getProvider(provider);
  const suggestedModels = catalogEntry?.suggestedModels ?? [];

  return (
    <div>
      <CardTitle>Provider & model</CardTitle>
      <CardDescription>
        Pick which of your connected providers this employee talks to by default. You can change
        this later.
      </CardDescription>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">Provider</span>
          <Select
            value={provider}
            onChange={(e) => {
              const nextEntry = getProvider(e.target.value);
              onChange({ provider: e.target.value, model: nextEntry?.suggestedModels[0] ?? "" });
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
          <Input
            value={model}
            onChange={(e) => onChange({ model: e.target.value })}
            placeholder="e.g. gpt-4o-mini"
            list="hire-suggested-models"
            required
          />
          <datalist id="hire-suggested-models">
            {suggestedModels.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
      </div>
    </div>
  );
}
