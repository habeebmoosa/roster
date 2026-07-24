/**
 * Provider catalog — pure data. Adding an OpenAI-compatible provider is a data
 * change here, not new code (MVP-Plan §3: config over hardcoding).
 *
 * `kind` selects how the registry instantiates the model:
 *   - openai / anthropic / google → native AI SDK providers
 *   - openai-compatible          → any endpoint speaking the OpenAI API
 */
export type ProviderKind = "openai" | "anthropic" | "google" | "openai-compatible";

export interface ProviderCatalogEntry {
  id: string;
  label: string;
  kind: ProviderKind;
  /** Default API base URL (mainly for openai-compatible providers). */
  defaultBaseUrl?: string;
  /** May the user set/override the base URL? (custom endpoints, Azure, proxies) */
  baseUrlEditable: boolean;
  /** Is a base URL mandatory? (generic custom endpoint with no default) */
  requiresBaseUrl: boolean;
  /** Example model ids to suggest in the UI. Free-text; not exhaustive. */
  suggestedModels: string[];
  /**
   * Text-embedding model id, if this provider supports embeddings via the AI
   * SDK (Phase 7). Undefined means this provider can't be used to ingest
   * knowledge — only openai/google set this today.
   */
  embeddingModel?: string;
}

const CATALOG: ProviderCatalogEntry[] = [
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["gpt-4o", "gpt-4o-mini", "o4-mini"],
    embeddingModel: "text-embedding-3-small",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    kind: "anthropic",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["claude-sonnet-5", "claude-opus-4-8", "claude-haiku-4-5-20251001"],
  },
  {
    id: "google",
    label: "Google Gemini",
    kind: "google",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["gemini-2.0-flash", "gemini-1.5-pro"],
    embeddingModel: "gemini-embedding-001",
  },
  {
    id: "groq",
    label: "Groq",
    kind: "openai-compatible",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai-compatible",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "mistral",
    label: "Mistral",
    kind: "openai-compatible",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["mistral-large-latest", "mistral-small-latest"],
  },
  {
    id: "together",
    label: "Together AI",
    kind: "openai-compatible",
    defaultBaseUrl: "https://api.together.xyz/v1",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["meta-llama/Llama-3.3-70B-Instruct-Turbo"],
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    kind: "openai-compatible",
    defaultBaseUrl: "https://api.x.ai/v1",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["grok-2-latest"],
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    kind: "openai-compatible",
    baseUrlEditable: true,
    requiresBaseUrl: true,
    suggestedModels: [],
  },
];

export function getProviderCatalog(): readonly ProviderCatalogEntry[] {
  return CATALOG;
}

export function getProvider(id: string): ProviderCatalogEntry | undefined {
  return CATALOG.find((entry) => entry.id === id);
}
