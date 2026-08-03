/**
 * Types + a pure parser for models.dev's public model catalog
 * (https://models.dev/api.json) — LLM_PROVIDER_MVP_PLAN.md Phase 5. Free,
 * open, cross-provider source for context window, pricing, modalities, and
 * reasoning/tool support; no auth needed. Confirmed live shape (2026-07-31):
 * a map of ~176 provider keys, each `{ id, name, models: Record<modelId, ...> }`.
 */

export interface ModelsDevModality {
  input: string[];
  output: string[];
}

export interface ModelsDevLimit {
  context?: number;
  input?: number;
  output?: number;
}

export interface ModelsDevCost {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
}

export interface ModelsDevModel {
  id: string;
  name: string;
  description?: string;
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  open_weights?: boolean;
  modalities?: ModelsDevModality;
  limit?: ModelsDevLimit;
  cost?: ModelsDevCost;
  knowledge?: string;
  release_date?: string;
}

export interface ModelsDevProvider {
  id: string;
  name: string;
  models: Record<string, ModelsDevModel>;
}

export type ModelsDevCatalog = Record<string, ModelsDevProvider>;

/**
 * Maps our catalog's provider ids (core/providers/catalog.ts) to models.dev's
 * provider keys — only listed where they actually differ; every other id is
 * looked up as-is (confirmed to match exactly: openai, anthropic,
 * amazon-bedrock, google-vertex, azure, openrouter, huggingface, deepinfra,
 * cerebras, groq, deepseek, mistral, xai, perplexity, cohere, google).
 */
const PROVIDER_ID_TO_MODELS_DEV_KEY: Record<string, string> = {
  together: "togetherai",
  fireworks: "fireworks-ai",
  "nvidia-nim": "nvidia",
};

/** No models.dev coverage for these — expected, not a sync failure (see server/models). */
export const UNCATALOGED_PROVIDERS = ["ollama", "custom"];

export function modelsDevKeyForProvider(providerId: string): string {
  return PROVIDER_ID_TO_MODELS_DEV_KEY[providerId] ?? providerId;
}

export interface NormalizedModel {
  modelId: string;
  label: string;
  description: string | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  reasoningSupport: boolean;
  toolCallSupport: boolean;
  structuredOutputSupport: boolean;
  openWeights: boolean;
  inputPricePerMTok: number | null;
  outputPricePerMTok: number | null;
  cacheReadPricePerMTok: number | null;
  cacheWritePricePerMTok: number | null;
  knowledgeCutoff: string | null;
  releaseDate: string | null;
}

/**
 * Extracts and normalizes one provider's models from the raw models.dev
 * catalog. Returns `[]` if the provider isn't present there — not an error,
 * see {@link UNCATALOGED_PROVIDERS} and the manual-entry fallback in the UI.
 */
export function extractModelsForProvider(
  catalog: ModelsDevCatalog,
  providerId: string,
): NormalizedModel[] {
  const provider = catalog[modelsDevKeyForProvider(providerId)];
  if (!provider?.models) return [];

  return Object.values(provider.models).map((model) => ({
    modelId: model.id,
    label: model.name || model.id,
    description: model.description ?? null,
    contextWindow: model.limit?.context ?? null,
    maxOutputTokens: model.limit?.output ?? null,
    inputModalities: model.modalities?.input ?? [],
    outputModalities: model.modalities?.output ?? [],
    reasoningSupport: Boolean(model.reasoning),
    toolCallSupport: Boolean(model.tool_call),
    structuredOutputSupport: Boolean(model.structured_output),
    openWeights: Boolean(model.open_weights),
    inputPricePerMTok: model.cost?.input ?? null,
    outputPricePerMTok: model.cost?.output ?? null,
    cacheReadPricePerMTok: model.cost?.cache_read ?? null,
    cacheWritePricePerMTok: model.cost?.cache_write ?? null,
    knowledgeCutoff: model.knowledge ?? null,
    releaseDate: model.release_date ?? null,
  }));
}
