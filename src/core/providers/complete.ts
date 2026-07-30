import { generateText, streamText } from "ai";
import { ByokError, mapProviderError } from "./errors";
import { resolveModel, type ResolveModelInput } from "./registry";

/**
 * Validate credentials with a ~1-token ping. Resolves on success; throws a
 * typed {@link ByokError} on any failure mode.
 */
export async function validateProviderCredentials(input: ResolveModelInput): Promise<void> {
  let model;
  try {
    model = resolveModel(input);
  } catch (err) {
    throw err instanceof ByokError ? err : mapProviderError(err);
  }

  try {
    // Single fast attempt — validation should fail fast on bad creds/URLs.
    await generateText({ model, prompt: "Reply with: OK", maxOutputTokens: 1, maxRetries: 0 });
  } catch (err) {
    throw mapProviderError(err);
  }
}

/**
 * Start a streaming completion. Resolution errors (unknown provider / bad base
 * URL) throw synchronously as {@link ByokError}; provider errors surface while
 * consuming the returned `textStream` (map them with {@link mapProviderError}).
 */
export function streamCompletion(input: ResolveModelInput, prompt: string) {
  const model = resolveModel(input);
  return streamText({ model, prompt });
}
