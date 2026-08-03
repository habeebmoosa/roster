import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createCerebras } from "@ai-sdk/cerebras";
import { createCohere } from "@ai-sdk/cohere";
import { createDeepInfra } from "@ai-sdk/deepinfra";
import { createFireworks } from "@ai-sdk/fireworks";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGoogleVertex } from "@ai-sdk/google-vertex";
import { createHuggingFace } from "@ai-sdk/huggingface";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createPerplexity } from "@ai-sdk/perplexity";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { getProvider } from "./catalog";
import { ByokError } from "./errors";

export interface ResolveModelInput {
  provider: string;
  model: string;
  /**
   * For a plain-bearer provider, the API key itself. For a multi-secret
   * provider (amazon-bedrock, google-vertex), a JSON-encoded object bundling
   * that provider's secret fields (see the per-kind cases below) — the same
   * string that gets encrypted as one blob in `ProviderKey.encryptedKey`.
   */
  apiKey: string;
  baseUrl?: string | null;
  headers?: Record<string, string>;
  /** Non-secret structured fields — region, project, location, resourceName, apiVersion, ... */
  config?: Record<string, unknown>;
}

function stringField(config: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = config?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function requireField(
  config: Record<string, unknown> | undefined,
  key: string,
  providerLabel: string,
): string {
  const value = stringField(config, key);
  if (!value) {
    throw new ByokError("missing_required_field", `"${key}" is required to use ${providerLabel}.`);
  }
  return value;
}

/** Unpacks a multi-secret provider's JSON-encoded credential bundle (see {@link ResolveModelInput.apiKey}). */
function parseSecretBundle(apiKey: string, providerLabel: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(apiKey);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // falls through to the error below
  }
  throw new ByokError("missing_required_field", `Malformed credentials for ${providerLabel}.`);
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
    case "cohere":
      return createCohere({ ...common, baseURL: baseURL || undefined })(input.model);
    case "perplexity":
      return createPerplexity({ ...common, baseURL: baseURL || undefined })(input.model);
    case "fireworks":
      return createFireworks({ ...common, baseURL: baseURL || undefined })(input.model);
    case "cerebras":
      return createCerebras({ ...common, baseURL: baseURL || undefined })(input.model);
    case "deepinfra":
      return createDeepInfra({ ...common, baseURL: baseURL || undefined })(input.model);
    case "huggingface":
      return createHuggingFace({ ...common, baseURL: baseURL || undefined })(input.model);
    case "openrouter":
      return createOpenRouter({ ...common, baseURL: baseURL || undefined })(input.model);

    case "azure": {
      const resourceName = stringField(input.config, "resourceName");
      if (!resourceName && !baseURL) {
        throw new ByokError(
          "missing_required_field",
          '"resourceName" (or a base URL) is required for Azure OpenAI.',
        );
      }
      return createAzure({
        ...common,
        resourceName,
        baseURL: baseURL || undefined,
        apiVersion: stringField(input.config, "apiVersion"),
      })(input.model);
    }

    case "amazon-bedrock": {
      const secret = parseSecretBundle(input.apiKey, "AWS Bedrock");
      const region = requireField(input.config, "region", "AWS Bedrock");
      return createAmazonBedrock({
        region,
        apiKey: typeof secret["apiKey"] === "string" ? secret["apiKey"] : undefined,
        accessKeyId: typeof secret["accessKeyId"] === "string" ? secret["accessKeyId"] : undefined,
        secretAccessKey:
          typeof secret["secretAccessKey"] === "string" ? secret["secretAccessKey"] : undefined,
        sessionToken: typeof secret["sessionToken"] === "string" ? secret["sessionToken"] : undefined,
        headers: input.headers,
      })(input.model);
    }

    case "google-vertex": {
      const secret = parseSecretBundle(input.apiKey, "Google Vertex AI");
      const project = requireField(input.config, "project", "Google Vertex AI");
      const location = requireField(input.config, "location", "Google Vertex AI");
      const clientEmail = typeof secret["clientEmail"] === "string" ? secret["clientEmail"] : undefined;
      const privateKey = typeof secret["privateKey"] === "string" ? secret["privateKey"] : undefined;
      return createGoogleVertex({
        project,
        location,
        apiKey: typeof secret["apiKey"] === "string" ? secret["apiKey"] : undefined,
        googleAuthOptions:
          clientEmail && privateKey
            ? { credentials: { client_email: clientEmail, private_key: privateKey } }
            : undefined,
        headers: input.headers,
      })(input.model);
    }

    case "openai-compatible": {
      if (!baseURL) {
        throw new ByokError("bad_base_url", "This provider requires a base URL.");
      }
      return createOpenAICompatible({ name: entry.id, baseURL, ...common }).chatModel(input.model);
    }
  }
}
