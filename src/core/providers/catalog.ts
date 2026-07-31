/**
 * Provider catalog — pure data. Adding an OpenAI-compatible provider is a data
 * change here, not new code (MVP-Plan §3: config over hardcoding).
 *
 * `kind` selects how the registry instantiates the model:
 *   - openai / anthropic / google / cohere / perplexity / fireworks /
 *     cerebras / deepinfra / huggingface / openrouter → native AI SDK providers,
 *     all a plain bearer apiKey + optional baseURL
 *   - azure          → Azure OpenAI (resourceName/baseURL + apiVersion, in `config`)
 *   - amazon-bedrock → AWS Bedrock (region required in `config`; secret bundle
 *                      of accessKeyId/secretAccessKey/sessionToken or apiKey,
 *                      JSON-encoded as the credential's `apiKey` string)
 *   - google-vertex  → Vertex AI (project/location required in `config`;
 *                      secret bundle of clientEmail/privateKey or apiKey)
 *   - openai-compatible → any endpoint speaking the OpenAI API, no native package
 */
export type ProviderKind =
  | "openai"
  | "anthropic"
  | "google"
  | "google-vertex"
  | "azure"
  | "amazon-bedrock"
  | "cohere"
  | "perplexity"
  | "fireworks"
  | "cerebras"
  | "deepinfra"
  | "huggingface"
  | "openrouter"
  | "openai-compatible";

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
    id: "cohere",
    label: "Cohere",
    kind: "cohere",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["command-a-03-2025", "command-r-plus"],
  },
  {
    id: "perplexity",
    label: "Perplexity",
    kind: "perplexity",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["sonar", "sonar-pro", "sonar-reasoning-pro"],
  },
  {
    id: "fireworks",
    label: "Fireworks AI",
    kind: "fireworks",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: [
      "accounts/fireworks/models/kimi-k2p6",
      "accounts/fireworks/models/deepseek-v4p1",
    ],
  },
  {
    id: "cerebras",
    label: "Cerebras",
    kind: "cerebras",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["llama3.1-70b", "llama-4-scout-17b-16e-instruct", "gpt-oss-120b"],
  },
  {
    id: "deepinfra",
    label: "DeepInfra",
    kind: "deepinfra",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["meta-llama/Llama-3.3-70B-Instruct", "deepseek-ai/DeepSeek-V3"],
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    kind: "huggingface",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["openai/gpt-oss-120b:cheapest", "deepseek-ai/DeepSeek-V3:together"],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openrouter",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["anthropic/claude-sonnet-4.5", "openai/gpt-5", "deepseek/deepseek-v4"],
  },
  {
    id: "azure",
    label: "Azure OpenAI",
    kind: "azure",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    // The "model" is your deployment name, not a shared model id — see the AI SDK docs.
    suggestedModels: [],
  },
  {
    id: "amazon-bedrock",
    label: "AWS Bedrock",
    kind: "amazon-bedrock",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["anthropic.claude-3-5-sonnet-20241022-v2:0", "us.amazon.nova-pro-v1:0"],
  },
  {
    id: "google-vertex",
    label: "Google Vertex AI",
    kind: "google-vertex",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["gemini-2.5-pro", "claude-3-5-sonnet@20240620"],
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
