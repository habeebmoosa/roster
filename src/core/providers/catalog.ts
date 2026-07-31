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
 *                      of accessKeyId/secretAccessKey/sessionToken, JSON-encoded
 *                      as the credential's `apiKey` string)
 *   - google-vertex  → Vertex AI (project/location required in `config`;
 *                      secret bundle of clientEmail/privateKey)
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

/** Groups the "Add provider" picker's grid (10.9 Phase 4). */
export type ProviderCategory =
  | "frontier"
  | "fast-open-weight"
  | "aggregator"
  | "enterprise"
  | "self-hosted";

/**
 * One form field beyond the base URL. `kind: "secret"` fields are bundled
 * together into one JSON object and encrypted as a single blob (a bare string
 * for the common single-secret case, e.g. `{"apiKey":"..."}` is never actually
 * wrapped — see ResolveModelInput's doc comment on the exact convention);
 * everything else lands in the credential's plain, unencrypted `config`.
 */
export interface ProviderField {
  /** Matches exactly what core/providers/registry.ts reads — from the secret bundle if `kind: "secret"`, from `config` otherwise. */
  key: string;
  label: string;
  kind: "secret" | "text" | "select";
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
}

export interface ProviderCatalogEntry {
  id: string;
  label: string;
  kind: ProviderKind;
  category: ProviderCategory;
  /** Whether this provider needs any secret at all — false only for Ollama. */
  requiresApiKey: boolean;
  /** Every field beyond the base URL: secrets bundled+encrypted, everything else in `config`. */
  fields: ProviderField[];
  /** "Get your API key" — shown next to the credential form (10.9 Phase 4/7). */
  docsUrl?: string;
  /** Default API base URL (mainly for openai-compatible providers). */
  defaultBaseUrl?: string;
  /** May the user set/override the base URL? (custom endpoints, Azure, proxies) */
  baseUrlEditable: boolean;
  /** Is a base URL mandatory? (generic custom endpoint with no default) */
  requiresBaseUrl: boolean;
  /** Example model ids to suggest in the UI. Free-text; not exhaustive — superseded by the model catalog (Phase 5). */
  suggestedModels: string[];
  /**
   * Text-embedding model id, if this provider supports embeddings via the AI
   * SDK (Phase 7). Undefined means this provider can't be used to ingest
   * knowledge — only openai/google set this today.
   */
  embeddingModel?: string;
}

const API_KEY_FIELD: ProviderField = {
  key: "apiKey",
  label: "API key",
  kind: "secret",
  required: true,
};

const CATALOG: ProviderCatalogEntry[] = [
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai",
    category: "frontier",
    requiresApiKey: true,
    fields: [{ ...API_KEY_FIELD, placeholder: "sk-..." }],
    docsUrl: "https://platform.openai.com/api-keys",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["gpt-4o", "gpt-4o-mini", "o4-mini"],
    embeddingModel: "text-embedding-3-small",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    kind: "anthropic",
    category: "frontier",
    requiresApiKey: true,
    fields: [{ ...API_KEY_FIELD, placeholder: "sk-ant-..." }],
    docsUrl: "https://console.anthropic.com/settings/keys",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["claude-sonnet-5", "claude-opus-4-8", "claude-haiku-4-5-20251001"],
  },
  {
    id: "google",
    label: "Google Gemini",
    kind: "google",
    category: "frontier",
    requiresApiKey: true,
    fields: [API_KEY_FIELD],
    docsUrl: "https://aistudio.google.com/apikey",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["gemini-2.0-flash", "gemini-1.5-pro"],
    embeddingModel: "gemini-embedding-001",
  },
  {
    id: "cohere",
    label: "Cohere",
    kind: "cohere",
    category: "frontier",
    requiresApiKey: true,
    fields: [API_KEY_FIELD],
    docsUrl: "https://dashboard.cohere.com/api-keys",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["command-a-03-2025", "command-r-plus"],
  },
  {
    id: "perplexity",
    label: "Perplexity",
    kind: "perplexity",
    category: "frontier",
    requiresApiKey: true,
    fields: [API_KEY_FIELD],
    docsUrl: "https://www.perplexity.ai/settings/api",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["sonar", "sonar-pro", "sonar-reasoning-pro"],
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    kind: "openai-compatible",
    category: "frontier",
    requiresApiKey: true,
    fields: [API_KEY_FIELD],
    docsUrl: "https://console.x.ai/",
    defaultBaseUrl: "https://api.x.ai/v1",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["grok-2-latest"],
  },
  {
    id: "mistral",
    label: "Mistral",
    kind: "openai-compatible",
    category: "frontier",
    requiresApiKey: true,
    fields: [API_KEY_FIELD],
    docsUrl: "https://console.mistral.ai/api-keys",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["mistral-large-latest", "mistral-small-latest"],
  },
  {
    id: "groq",
    label: "Groq",
    kind: "openai-compatible",
    category: "fast-open-weight",
    requiresApiKey: true,
    fields: [API_KEY_FIELD],
    docsUrl: "https://console.groq.com/keys",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai-compatible",
    category: "fast-open-weight",
    requiresApiKey: true,
    fields: [API_KEY_FIELD],
    docsUrl: "https://platform.deepseek.com/api_keys",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "together",
    label: "Together AI",
    kind: "openai-compatible",
    category: "fast-open-weight",
    requiresApiKey: true,
    fields: [API_KEY_FIELD],
    docsUrl: "https://api.together.ai/settings/api-keys",
    defaultBaseUrl: "https://api.together.xyz/v1",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["meta-llama/Llama-3.3-70B-Instruct-Turbo"],
  },
  {
    id: "fireworks",
    label: "Fireworks AI",
    kind: "fireworks",
    category: "fast-open-weight",
    requiresApiKey: true,
    fields: [API_KEY_FIELD],
    docsUrl: "https://fireworks.ai/account/api-keys",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    // Model ids on Fireworks carry the account prefix — not a stray typo.
    suggestedModels: [
      "accounts/fireworks/models/kimi-k2p6",
      "accounts/fireworks/models/deepseek-v4p1",
    ],
  },
  {
    id: "cerebras",
    label: "Cerebras",
    kind: "cerebras",
    category: "fast-open-weight",
    requiresApiKey: true,
    fields: [
      {
        ...API_KEY_FIELD,
        helpText: "The free tier hard-caps context at 8K tokens — long conversations may get truncated.",
      },
    ],
    docsUrl: "https://cloud.cerebras.ai/",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["llama3.1-70b", "llama-4-scout-17b-16e-instruct", "gpt-oss-120b"],
  },
  {
    id: "deepinfra",
    label: "DeepInfra",
    kind: "deepinfra",
    category: "fast-open-weight",
    requiresApiKey: true,
    fields: [API_KEY_FIELD],
    docsUrl: "https://deepinfra.com/dash/api_keys",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["meta-llama/Llama-3.3-70B-Instruct", "deepseek-ai/DeepSeek-V3"],
  },
  {
    id: "nvidia-nim",
    label: "NVIDIA NIM",
    kind: "openai-compatible",
    category: "fast-open-weight",
    requiresApiKey: true,
    fields: [{ ...API_KEY_FIELD, placeholder: "nvapi-..." }],
    docsUrl: "https://build.nvidia.com/",
    defaultBaseUrl: "https://integrate.api.nvidia.com/v1",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["meta/llama-3.1-405b-instruct", "deepseek-ai/deepseek-r1"],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openrouter",
    category: "aggregator",
    requiresApiKey: true,
    fields: [API_KEY_FIELD],
    docsUrl: "https://openrouter.ai/settings/keys",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["anthropic/claude-sonnet-4.5", "openai/gpt-5", "deepseek/deepseek-v4"],
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    kind: "huggingface",
    category: "aggregator",
    requiresApiKey: true,
    fields: [
      {
        ...API_KEY_FIELD,
        helpText:
          'The token needs the "Make calls to Inference Providers" permission scope, or requests are rejected even with a valid key.',
      },
    ],
    docsUrl: "https://huggingface.co/settings/tokens",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    suggestedModels: ["openai/gpt-oss-120b:cheapest", "deepseek-ai/DeepSeek-V3:together"],
  },
  {
    id: "azure",
    label: "Azure OpenAI",
    kind: "azure",
    category: "enterprise",
    requiresApiKey: true,
    fields: [
      API_KEY_FIELD,
      {
        key: "resourceName",
        label: "Resource name",
        kind: "text",
        required: false,
        placeholder: "my-resource",
        helpText:
          "Either this or a base URL — builds https://{resourceName}.openai.azure.com. The model id you use elsewhere is your deployment name.",
      },
      {
        key: "apiVersion",
        label: "API version",
        kind: "text",
        required: false,
        placeholder: "preview",
      },
    ],
    docsUrl: "https://portal.azure.com/",
    baseUrlEditable: true,
    requiresBaseUrl: false,
    // The "model" is your deployment name, not a shared model id — see the AI SDK docs.
    suggestedModels: [],
  },
  {
    id: "amazon-bedrock",
    label: "AWS Bedrock",
    kind: "amazon-bedrock",
    category: "enterprise",
    requiresApiKey: true,
    fields: [
      {
        key: "accessKeyId",
        label: "Access key ID",
        kind: "secret",
        required: true,
      },
      {
        key: "secretAccessKey",
        label: "Secret access key",
        kind: "secret",
        required: true,
      },
      {
        key: "sessionToken",
        label: "Session token",
        kind: "secret",
        required: false,
        helpText: "Only needed for temporary/STS credentials.",
      },
      {
        key: "region",
        label: "AWS region",
        kind: "text",
        required: true,
        placeholder: "us-east-1",
      },
    ],
    docsUrl: "https://console.aws.amazon.com/iam/home#/security_credentials",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["anthropic.claude-3-5-sonnet-20241022-v2:0", "us.amazon.nova-pro-v1:0"],
  },
  {
    id: "google-vertex",
    label: "Google Vertex AI",
    kind: "google-vertex",
    category: "enterprise",
    requiresApiKey: true,
    fields: [
      {
        key: "clientEmail",
        label: "Service account email",
        kind: "secret",
        required: true,
        placeholder: "my-sa@my-project.iam.gserviceaccount.com",
      },
      {
        key: "privateKey",
        label: "Service account private key",
        kind: "secret",
        required: true,
        helpText: "The private_key field from your service account's downloaded JSON key.",
      },
      {
        key: "project",
        label: "GCP project ID",
        kind: "text",
        required: true,
      },
      {
        key: "location",
        label: "Location",
        kind: "text",
        required: true,
        placeholder: "us-central1",
      },
    ],
    docsUrl: "https://console.cloud.google.com/iam-admin/serviceaccounts",
    baseUrlEditable: false,
    requiresBaseUrl: false,
    suggestedModels: ["gemini-2.5-pro", "claude-3-5-sonnet@20240620"],
  },
  {
    id: "ollama",
    label: "Ollama",
    kind: "openai-compatible",
    category: "self-hosted",
    requiresApiKey: false,
    fields: [],
    docsUrl: "https://docs.ollama.com/api/openai-compatibility",
    defaultBaseUrl: "http://localhost:11434/v1",
    baseUrlEditable: true,
    requiresBaseUrl: true,
    // Whatever the user has pulled locally — not enumerable from here; see Phase 5 (model catalog).
    suggestedModels: [],
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    kind: "openai-compatible",
    category: "self-hosted",
    requiresApiKey: true,
    fields: [API_KEY_FIELD],
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
