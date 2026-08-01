"use client";

import { useEffect, useState } from "react";
import type { ModelOption } from "@/core/models/model-option";

/**
 * Real model options for a provider — from the synced catalog, or, for
 * Ollama, a live (debounced) introspection of whatever base URL the user has
 * typed so far. Empty for providers with neither (e.g. "custom") — callers
 * should fall back to the catalog's static `suggestedModels` in that case.
 */
export function useModelOptions(
  providerId: string,
  ollamaBaseUrl?: string,
): { options: ModelOption[]; loading: boolean } {
  const [options, setOptions] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!providerId) {
      setOptions([]);
      return;
    }
    const isOllama = providerId === "ollama";
    if (isOllama && !ollamaBaseUrl?.trim()) {
      setOptions([]);
      return;
    }

    let cancelled = false;
    // Debounce Ollama lookups since the base URL changes on every keystroke;
    // every other provider's list is DB-backed and cheap to fetch immediately.
    const timer = setTimeout(
      async () => {
        setLoading(true);
        try {
          const qs = isOllama ? `?baseUrl=${encodeURIComponent(ollamaBaseUrl!.trim())}` : "";
          const res = await fetch(`/api/models/${providerId}${qs}`);
          const data = res.ok ? await res.json() : null;
          if (!cancelled) setOptions(Array.isArray(data?.models) ? data.models : []);
        } catch {
          if (!cancelled) setOptions([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      isOllama ? 500 : 0,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [providerId, ollamaBaseUrl]);

  return { options, loading };
}
