import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { getProvider } from "./catalog";
import { ByokError } from "./errors";

export interface ResolveModelInput {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string | null;
  headers?: Record<string, string>;
}

/**
 * The single choke point for turning (provider, model, credentials) into an AI
 * SDK model instance. Chat, the REST API, the eval harness, and the playground
 * all resolve models through here.
 */
export function resolveModel(input: ResolveModelInput): LanguageModel {
  const entry = getProvider(input.provider);
  if (!entry) {
    throw new ByokError("unknown_provider", `Unknown provider: ${input.provider}`);
  }

  const baseURL = input.baseUrl?.trim() || entry.defaultBaseUrl;
  const common = { apiKey: input.apiKey, headers: input.headers };

  switch (entry.kind) {
    case "openai":
      return createOpenAI({ ...common, baseURL: baseURL || undefined }).chat(input.model);
    case "anthropic":
      return createAnthropic({ ...common, baseURL: baseURL || undefined })(input.model);
    case "google":
      return createGoogleGenerativeAI({ ...common, baseURL: baseURL || undefined })(input.model);
    case "openai-compatible": {
      if (!baseURL) {
        throw new ByokError("bad_base_url", "This provider requires a base URL.");
      }
      return createOpenAICompatible({ name: entry.id, baseURL, ...common }).chatModel(input.model);
    }
  }
}
