export {
  getProviderCatalog,
  getProvider,
  type ProviderCatalogEntry,
  type ProviderKind,
} from "./catalog";
export { ByokError, mapProviderError, type ByokErrorCode } from "./errors";
export { resolveReasoningOptions } from "./reasoning";
export { resolveModel, type ResolveModelInput } from "./registry";
export { validateProviderCredentials, streamCompletion } from "./complete";
export {
  isEmbeddingCapable,
  resolveEmbeddingModel,
  padEmbedding,
  embedTexts,
  TARGET_EMBEDDING_DIMENSIONS,
  type ResolveEmbeddingModelInput,
} from "./embed";
