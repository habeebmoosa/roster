import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { embedMany, type EmbeddingModel } from "ai";
import { getProvider } from "./catalog";
import { ByokError, mapProviderError } from "./errors";

/**
 * Every agent's knowledge lives in one fixed-width pgvector column
 * (AgentKnowledge.embedding). OpenAI and Google both support requesting a
 * specific output dimensionality, so we ask for this exact width from either
 * — `padEmbedding` below is only a defensive fallback if a provider ever
 * ignores that request.
 */
export const TARGET_EMBEDDING_DIMENSIONS = 1536;

/**
 * Unlike {@link ResolveModelInput}, there's no user-chosen `model` — the
 * embedding model id is fixed per provider (catalog's `embeddingModel`).
 */
export interface ResolveEmbeddingModelInput {
  provider: string;
  apiKey: string;
  baseUrl?: string | null;
  headers?: Record<string, string>;
}

export function isEmbeddingCapable(providerId: string): boolean {
  return Boolean(getProvider(providerId)?.embeddingModel);
}

/** Resolve an AI SDK embedding model for a BYOK-connected provider. */
export function resolveEmbeddingModel(input: ResolveEmbeddingModelInput): EmbeddingModel {
  const entry = getProvider(input.provider);
  if (!entry?.embeddingModel) {
    throw new ByokError(
      "embeddings_unsupported",
      `Provider "${input.provider}" does not support embeddings.`,
    );
  }

  const baseURL = input.baseUrl?.trim() || entry.defaultBaseUrl;
  const common = { apiKey: input.apiKey, headers: input.headers };

  switch (entry.kind) {
    case "openai":
      return createOpenAI({ ...common, baseURL: baseURL || undefined }).textEmbeddingModel(
        entry.embeddingModel,
      );
    case "google":
      return createGoogleGenerativeAI({
        ...common,
        baseURL: baseURL || undefined,
      }).textEmbeddingModel(entry.embeddingModel);
    default:
      throw new ByokError(
        "embeddings_unsupported",
        `Provider "${input.provider}" does not support embeddings.`,
      );
  }
}

/** Zero-pad a shorter embedding to `targetDim` — preserves cosine similarity exactly. */
export function padEmbedding(
  vector: number[],
  targetDim: number = TARGET_EMBEDDING_DIMENSIONS,
): number[] {
  if (vector.length === targetDim) return vector;
  if (vector.length > targetDim) {
    throw new Error(`Embedding has ${vector.length} dimensions, exceeding target ${targetDim}.`);
  }
  return [...vector, ...new Array(targetDim - vector.length).fill(0)];
}

/** Embed a batch of texts through a BYOK provider, normalized to TARGET_EMBEDDING_DIMENSIONS. */
export async function embedTexts(
  input: ResolveEmbeddingModelInput,
  texts: string[],
): Promise<number[][]> {
  const entry = getProvider(input.provider);
  let model: EmbeddingModel;
  try {
    model = resolveEmbeddingModel(input);
  } catch (err) {
    throw err instanceof ByokError ? err : mapProviderError(err);
  }

  try {
    const { embeddings } = await embedMany({
      model,
      values: texts,
      ...(entry?.kind === "openai"
        ? { providerOptions: { openai: { dimensions: TARGET_EMBEDDING_DIMENSIONS } } }
        : { providerOptions: { google: { outputDimensionality: TARGET_EMBEDDING_DIMENSIONS } } }),
    });
    return embeddings.map((e) => padEmbedding(e));
  } catch (err) {
    throw mapProviderError(err);
  }
}
