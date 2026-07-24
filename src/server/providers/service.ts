import type { LanguageModel } from "ai";
import {
  ByokError,
  getProvider,
  isEmbeddingCapable,
  resolveModel,
  validateProviderCredentials,
  type ResolveEmbeddingModelInput,
  type ResolveModelInput,
} from "@/core/providers";
import { decryptSecret, encryptSecret } from "@/server/crypto/vault";
import {
  deleteProviderKey,
  getProviderKeyWithSecret,
  listProviderKeys,
  upsertProviderKey,
  type ProviderKeyRecord,
} from "@/server/db/repositories/provider-key.repository";

/**
 * Server-side orchestration for BYOK: validate → encrypt → persist, and
 * request-time decrypt → resolve. The only place the plaintext key is handled,
 * and it is never logged or returned to the client.
 */
export interface AddProviderKeyInput {
  userId: string;
  provider: string;
  apiKey: string;
  model: string; // used for the validation ping
  baseUrl?: string | null;
  label?: string | null;
  config?: Record<string, unknown>;
}

export function listUserProviders(userId: string): Promise<ProviderKeyRecord[]> {
  return listProviderKeys(userId);
}

export async function addProviderKey(input: AddProviderKeyInput): Promise<void> {
  const entry = getProvider(input.provider);
  if (!entry) throw new ByokError("unknown_provider");
  if (entry.requiresBaseUrl && !input.baseUrl?.trim()) {
    throw new ByokError("bad_base_url", "This provider requires a base URL.");
  }

  const headers = extractHeaders(input.config);

  // Validate against the live provider BEFORE persisting anything.
  await validateProviderCredentials({
    provider: input.provider,
    model: input.model,
    apiKey: input.apiKey,
    baseUrl: input.baseUrl ?? null,
    headers,
  });

  await upsertProviderKey({
    userId: input.userId,
    provider: input.provider,
    label: input.label ?? null,
    encryptedKey: encryptSecret(input.apiKey),
    baseUrl: input.baseUrl ?? null,
    config: input.config ?? {},
  });
}

export function removeProviderKey(userId: string, provider: string): Promise<void> {
  return deleteProviderKey(userId, provider);
}

/** Build a ready-to-use model input for a user's stored provider (decrypts here). */
export async function getResolveInputForUser(
  userId: string,
  provider: string,
  model: string,
): Promise<ResolveModelInput> {
  const record = await getProviderKeyWithSecret(userId, provider);
  if (!record) {
    throw new ByokError("unknown_provider", "No key is configured for this provider.");
  }
  return {
    provider: record.provider,
    model,
    apiKey: decryptSecret(record.encryptedKey),
    baseUrl: record.baseUrl,
    headers: extractHeaders(record.config),
  };
}

/** Resolve a ready-to-use AI SDK model for a user's stored provider (decrypts here). */
export async function getModelForUser(
  userId: string,
  provider: string,
  model: string,
): Promise<LanguageModel> {
  return resolveModel(await getResolveInputForUser(userId, provider, model));
}

/** Preference order when a user has more than one embedding-capable provider connected. */
const EMBEDDING_PROVIDER_PREFERENCE = ["openai", "google"];

/**
 * Pick the user's best-available embedding-capable provider and build a
 * ready-to-use embedding input (decrypts here). Ingestion and query-time
 * embedding both go through this so they stay on the same provider/model —
 * required for cosine similarity to mean anything (see AgentKnowledge doc
 * comment in schema.prisma).
 */
export async function getEmbeddingResolveInputForUser(
  userId: string,
): Promise<ResolveEmbeddingModelInput & { provider: string }> {
  const keys = await listProviderKeys(userId);
  const capable = keys.filter((k) => isEmbeddingCapable(k.provider));
  const candidate =
    EMBEDDING_PROVIDER_PREFERENCE.map((provider) =>
      capable.find((k) => k.provider === provider),
    ).find(Boolean) ?? capable[0];

  if (!candidate) {
    throw new ByokError(
      "embeddings_unsupported",
      "Connect an OpenAI or Google provider to ingest or search knowledge.",
    );
  }

  const record = await getProviderKeyWithSecret(userId, candidate.provider);
  if (!record) {
    throw new ByokError("embeddings_unsupported", "No key is configured for this provider.");
  }

  return {
    provider: record.provider,
    apiKey: decryptSecret(record.encryptedKey),
    baseUrl: record.baseUrl,
    headers: extractHeaders(record.config),
  };
}

function extractHeaders(config?: Record<string, unknown>): Record<string, string> | undefined {
  const raw = config?.["headers"];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") headers[key] = value;
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}
