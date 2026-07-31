import { APICallError } from "ai";

/**
 * BYOK failure taxonomy. Every provider error is mapped to one of these codes
 * so the UI/API can show a specific, friendly message (never a raw stack trace).
 */
export type ByokErrorCode =
  | "invalid_key"
  | "rate_limited"
  | "insufficient_quota"
  | "bad_base_url"
  | "model_not_found"
  | "unknown_provider"
  | "embeddings_unsupported"
  | "duplicate_label"
  | "not_found"
  | "unknown";

const USER_MESSAGES: Record<ByokErrorCode, string> = {
  invalid_key: "The API key was rejected. Double-check the key and try again.",
  rate_limited: "The provider is rate-limiting requests right now. Wait a moment and retry.",
  insufficient_quota: "This key has no remaining quota, or billing isn't set up with the provider.",
  bad_base_url: "Couldn't reach the provider endpoint. Check the base URL.",
  model_not_found: "That model wasn't found for this provider. Check the model id.",
  unknown_provider: "Unknown provider.",
  embeddings_unsupported:
    "This provider doesn't support embeddings. Connect OpenAI or Google to ingest knowledge.",
  duplicate_label: "You already have a credential with that name for this provider.",
  not_found: "That credential doesn't exist.",
  unknown: "Something went wrong talking to the provider.",
};

export class ByokError extends Error {
  readonly code: ByokErrorCode;

  constructor(code: ByokErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? USER_MESSAGES[code], options);
    this.name = "ByokError";
    this.code = code;
  }

  /** Safe, user-facing message for this failure mode. */
  get userMessage(): string {
    return USER_MESSAGES[this.code];
  }
}

const NETWORK_HINTS = ["enotfound", "econnrefused", "eai_again", "fetch failed", "network"];

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const haystack =
    `${err.message} ${String((err.cause as { code?: string } | undefined)?.code ?? "")}`.toLowerCase();
  return NETWORK_HINTS.some((hint) => haystack.includes(hint));
}

/** Normalize any thrown provider error into a typed {@link ByokError}. */
export function mapProviderError(err: unknown): ByokError {
  if (err instanceof ByokError) return err;

  if (APICallError.isInstance(err)) {
    const status = err.statusCode;
    const body = typeof err.responseBody === "string" ? err.responseBody.toLowerCase() : "";

    if (status === 401 || status === 403) {
      return new ByokError("invalid_key", err.message, { cause: err });
    }
    if (status === 429) {
      const quota =
        body.includes("quota") || body.includes("billing") || body.includes("insufficient");
      return new ByokError(quota ? "insufficient_quota" : "rate_limited", err.message, {
        cause: err,
      });
    }
    if (status === 404 || (status === 400 && body.includes("model"))) {
      return new ByokError("model_not_found", err.message, { cause: err });
    }
    if (status === undefined) {
      // No HTTP status → the request never reached a real API (bad base URL).
      return new ByokError("bad_base_url", err.message, { cause: err });
    }
    return new ByokError("unknown", err.message, { cause: err });
  }

  if (isNetworkError(err)) {
    return new ByokError("bad_base_url", messageOf(err), { cause: err });
  }

  return new ByokError("unknown", messageOf(err), { cause: err });
}
