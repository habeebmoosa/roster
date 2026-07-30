import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import { ByokError, mapProviderError } from "./errors";

function apiError(statusCode: number | undefined, responseBody = ""): APICallError {
  return new APICallError({
    message: "provider error",
    url: "https://api.example.com/v1/chat/completions",
    requestBodyValues: {},
    statusCode,
    responseBody,
    isRetryable: false,
  });
}

describe("mapProviderError", () => {
  it("maps 401/403 to invalid_key", () => {
    expect(mapProviderError(apiError(401)).code).toBe("invalid_key");
    expect(mapProviderError(apiError(403)).code).toBe("invalid_key");
  });

  it("maps 429 to rate_limited", () => {
    expect(mapProviderError(apiError(429)).code).toBe("rate_limited");
  });

  it("maps 429 with quota/billing hints to insufficient_quota", () => {
    expect(mapProviderError(apiError(429, "You exceeded your current quota")).code).toBe(
      "insufficient_quota",
    );
  });

  it("maps 404 to model_not_found", () => {
    expect(mapProviderError(apiError(404)).code).toBe("model_not_found");
  });

  it("maps a status-less API error to bad_base_url", () => {
    expect(mapProviderError(apiError(undefined)).code).toBe("bad_base_url");
  });

  it("maps raw network errors to bad_base_url", () => {
    const err = new Error("fetch failed");
    (err as Error & { cause?: unknown }).cause = { code: "ENOTFOUND" };
    expect(mapProviderError(err).code).toBe("bad_base_url");
  });

  it("passes through an existing ByokError unchanged", () => {
    const original = new ByokError("invalid_key");
    expect(mapProviderError(original)).toBe(original);
  });

  it("falls back to unknown for unrecognized errors", () => {
    expect(mapProviderError(new Error("mystery")).code).toBe("unknown");
  });

  it("exposes a friendly userMessage per code", () => {
    expect(new ByokError("bad_base_url").userMessage).toMatch(/base URL/i);
  });
});
