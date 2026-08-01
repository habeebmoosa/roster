"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "@/hooks/use-toast";
import { useModelOptions } from "@/hooks/use-model-options";
import type { ProviderCatalogEntry } from "@/core/providers/catalog";
import type { ModelOption } from "@/core/models/model-option";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import {
  Button,
  IconChevronLeft,
  IconExternalLink,
  Input,
  Select,
  Switch,
} from "@/ui";
import { ProviderLogo } from "./provider-logo";

function formatTokenCount(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
}

function formatModelHint(option: ModelOption): string {
  const parts: string[] = [];
  if (option.contextWindow) parts.push(`${formatTokenCount(option.contextWindow)} context`);
  if (option.inputPricePerMTok != null && option.outputPricePerMTok != null) {
    parts.push(`$${option.inputPricePerMTok} / $${option.outputPricePerMTok} per 1M tokens`);
  }
  if (option.reasoningSupport) parts.push("reasoning");
  return parts.join(" · ");
}

export interface CredentialFormProps {
  provider: ProviderCatalogEntry;
  /** Present for edit mode — prefills non-secret fields; secret fields always start blank. */
  existing?: ProviderKeyRecord;
  /** Add mode only: show the "make default" toggle (irrelevant for a provider's first credential — always default). */
  hasExistingCredentials?: boolean;
  /** Add mode only: returns to the provider picker. */
  onBack?: () => void;
  /** Called both on Cancel and after a successful save — in every real usage the two navigate to the same place. */
  onClose: () => void;
}

function configValue(config: Record<string, unknown> | undefined, key: string): string {
  const value = config?.[key];
  return typeof value === "string" ? value : "";
}

export function CredentialForm({
  provider,
  existing,
  hasExistingCredentials,
  onBack,
  onClose,
}: CredentialFormProps) {
  const router = useRouter();
  const isEdit = Boolean(existing);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      provider.fields.map((f) => [f.key, f.kind === "secret" ? "" : configValue(existing?.config, f.key)]),
    ),
  );
  const [label, setLabel] = useState(existing?.label ?? "");
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? "");
  const [model, setModel] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  function setField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const showBaseUrl = provider.baseUrlEditable || provider.requiresBaseUrl;
  const { options: modelOptions } = useModelOptions(
    provider.id,
    provider.id === "ollama" ? baseUrl : undefined,
  );
  const modelDatalistValues =
    modelOptions.length > 0 ? modelOptions.map((o) => o.modelId) : provider.suggestedModels;
  const selectedModelOption = modelOptions.find((o) => o.modelId === model.trim());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");

    const secretFields = provider.fields.filter((f) => f.kind === "secret");
    const filledSecretFields = secretFields.filter((f) => values[f.key]?.trim());

    if (isEdit && filledSecretFields.length > 0) {
      // Once any secret field changes, every *required* one must come along
      // (they're bundled into one blob) — but an optional one (e.g. Bedrock's
      // session token) is still fine left blank.
      const missingRequired = secretFields.filter((f) => f.required && !values[f.key]?.trim());
      if (missingRequired.length > 0) {
        setStatus("error");
        setMessage(
          `To replace the credential, fill in all of: ${missingRequired.map((f) => f.label).join(", ")}.`,
        );
        return;
      }
    }

    const secrets =
      !isEdit || filledSecretFields.length > 0
        ? Object.fromEntries(secretFields.map((f) => [f.key, values[f.key]?.trim() ?? ""]))
        : undefined;
    const config = Object.fromEntries(
      provider.fields.filter((f) => f.kind !== "secret").map((f) => [f.key, values[f.key]?.trim() ?? ""]),
    );

    try {
      const res = isEdit
        ? await fetch(`/api/providers/${provider.id}/credentials/${existing!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: label.trim() || undefined,
              secrets,
              baseUrl: baseUrl.trim() || null,
              config,
              model: model.trim() || undefined,
            }),
          })
        : await fetch("/api/providers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: provider.id,
              secrets,
              baseUrl: baseUrl.trim() || undefined,
              label: label.trim() || undefined,
              config,
              model: model.trim(),
              makeDefault,
            }),
          });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error?.message ?? "Something went wrong.");
        return;
      }

      toast({
        title: isEdit ? `Updated ${provider.label}` : `Connected ${provider.label}`,
        variant: "success",
      });
      router.refresh();
      onClose();
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="p-6 md:p-8">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-text-muted hover:text-text flex items-center gap-1 text-sm"
          >
            <IconChevronLeft className="h-4 w-4" />
            Back
          </button>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <ProviderLogo id={provider.id} label={provider.label} className="h-12 w-12" />
          <div>
            <h2 className="text-text text-lg font-semibold">{provider.label}</h2>
            {provider.docsUrl ? (
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent inline-flex items-center gap-1 text-sm hover:underline"
              >
                Get your API key
                <IconExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          {provider.fields.map((field) => (
            <label key={field.key} className="grid gap-1 text-sm">
              <span className="text-text font-medium">
                {field.label}
                {!field.required ? <span className="text-text-faint"> (optional)</span> : null}
              </span>
              {field.kind === "select" ? (
                <Select
                  value={values[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  required={field.required && !isEdit}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {field.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={field.kind === "secret" ? "password" : "text"}
                  value={values[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={
                    isEdit && field.kind === "secret"
                      ? "Leave blank to keep the current value"
                      : field.placeholder
                  }
                  autoComplete="off"
                  required={field.required && !(isEdit && field.kind === "secret")}
                />
              )}
              {field.helpText ? <span className="text-text-faint text-xs">{field.helpText}</span> : null}
            </label>
          ))}

          {showBaseUrl ? (
            <label className="grid gap-1 text-sm">
              <span className="text-text font-medium">
                Base URL {provider.requiresBaseUrl ? "" : <span className="text-text-faint">(optional)</span>}
              </span>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={provider.defaultBaseUrl ?? "https://api.example.com/v1"}
                required={provider.requiresBaseUrl}
              />
            </label>
          ) : null}

          <label className="grid gap-1 text-sm">
            <span className="text-text font-medium">
              Model {isEdit ? <span className="text-text-faint">(optional — re-checks this still works)</span> : null}
            </span>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider.suggestedModels[0] ?? "e.g. gpt-4o-mini"}
              list={`suggested-models-${provider.id}`}
              required={!isEdit}
            />
            <datalist id={`suggested-models-${provider.id}`}>
              {modelDatalistValues.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            {selectedModelOption ? (
              <span className="text-text-faint text-xs">{formatModelHint(selectedModelOption)}</span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-text font-medium">
              Name this credential <span className="text-text-faint">(optional)</span>
            </span>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Personal, Work"
            />
          </label>

          {!isEdit && hasExistingCredentials ? (
            <div className="flex items-center justify-between">
              <span className="text-text text-sm font-medium">Make this the default</span>
              <Switch checked={makeDefault} onCheckedChange={setMakeDefault} />
            </div>
          ) : null}

          <div className="mt-2 flex items-center gap-3">
            <Button type="submit" disabled={status === "saving"}>
              {status === "saving" ? "Validating…" : isEdit ? "Save changes" : "Validate & add"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {message ? (
              <span className="text-danger text-sm" role="status">
                {message}
              </span>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
