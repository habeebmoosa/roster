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
import { ANALYTICS_EVENTS } from "@/server/analytics/events";
import { logEvent } from "@/server/analytics/log-event";
import { decryptSecret, encryptSecret } from "@/server/crypto/vault";
import {
  createProviderKey,
  deleteAllCredentialsForProvider,
  deleteProviderKeyById,
  getDefaultProviderKey,
  listCredentialsForProvider,
  listDefaultProviderKeys,
  setDefaultProviderKey,
  updateProviderKey,
  type ProviderKeyRecord,
} from "@/server/db/repositories/provider-key.repository";

/**
 * Server-side orchestration for BYOK: validate → encrypt → persist, and
 * request-time decrypt → resolve. The only place the plaintext key is handled,
 * and it is never logged or returned to the client.
 *
 * A provider can have several stored credentials (e.g. a personal key and a
 * work key) — everything outside Settings resolves through the provider's
 * current *default* credential, so runAgent()/chat/REST/eval never need to
 * know a provider might have more than one.
 */
export interface AddProviderKeyInput {
  userId: string;
  provider: string;
  apiKey: string;
  model: string; // used for the validation ping
  baseUrl?: string | null;
  label?: string | null;
  config?: Record<string, unknown>;
  makeDefault?: boolean;
}

/** One row per configured provider — that provider's default credential. Used everywhere outside Settings. */
export function listUserProviders(userId: string): Promise<ProviderKeyRecord[]> {
  return listDefaultProviderKeys(userId);
}

/** Every credential configured for one provider — for the Settings "manage credentials" dialog. */
export function listProviderCredentials(
  userId: string,
  provider: string,
): Promise<ProviderKeyRecord[]> {
  return listCredentialsForProvider(userId, provider);
}

async function nextAvailableLabel(userId: string, provider: string, desired: string): Promise<string> {
  const taken = new Set((await listCredentialsForProvider(userId, provider)).map((c) => c.label));
  if (!taken.has(desired)) return desired;
  for (let n = 2; ; n++) {
    const candidate = `${desired} ${n}`;
    if (!taken.has(candidate)) return candidate;
  }
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

  const requestedLabel = input.label?.trim();
  if (requestedLabel) {
    const taken = (await listCredentialsForProvider(input.userId, input.provider)).some(
      (c) => c.label === requestedLabel,
    );
    if (taken) throw new ByokError("duplicate_label");
  }
  const label = requestedLabel || (await nextAvailableLabel(input.userId, input.provider, "Default"));

  await createProviderKey({
    userId: input.userId,
    provider: input.provider,
    label,
    encryptedKey: encryptSecret(input.apiKey),
    baseUrl: input.baseUrl ?? null,
    config: input.config ?? {},
    makeDefault: input.makeDefault,
  });

  await logEvent({
    userId: input.userId,
    event: ANALYTICS_EVENTS.PROVIDER_KEY_ADDED,
    metadata: { provider: input.provider },
  });
}

/** Deletes every credential configured for a provider — today's "remove provider" action. */
export function removeProviderKey(userId: string, provider: string): Promise<void> {
  return deleteAllCredentialsForProvider(userId, provider);
}

/** Deletes one specific credential (promotes a new default if it was the default — see the repository). */
export function removeProviderCredential(userId: string, credentialId: string): Promise<void> {
  return deleteProviderKeyById(userId, credentialId);
}

/** Marks one credential as its provider's default. */
export function setDefaultProviderCredential(
  userId: string,
  provider: string,
  credentialId: string,
): Promise<void> {
  return setDefaultProviderKey(userId, provider, credentialId);
}

export interface UpdateProviderCredentialInput {
  label?: string;
  apiKey?: string; // omit to keep the existing secret unchanged
  baseUrl?: string | null;
  config?: Record<string, unknown>;
}

/** Edits a credential in place; re-encrypts a new secret only if one was supplied. */
export async function updateProviderCredential(
  userId: string,
  credentialId: string,
  input: UpdateProviderCredentialInput,
): Promise<ProviderKeyRecord> {
  const updated = await updateProviderKey(userId, credentialId, {
    label: input.label,
    encryptedKey: input.apiKey ? encryptSecret(input.apiKey) : undefined,
    baseUrl: input.baseUrl,
    config: input.config,
  });
  if (!updated) throw new ByokError("not_found");
  return updated;
}

/** Build a ready-to-use model input for a user's stored provider (decrypts here). Resolves to the provider's current default credential. */
export async function getResolveInputForUser(
  userId: string,
  provider: string,
  model: string,
): Promise<ResolveModelInput> {
  const record = await getDefaultProviderKey(userId, provider);
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
  const keys = await listDefaultProviderKeys(userId);
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

  const record = await getDefaultProviderKey(userId, candidate.provider);
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
