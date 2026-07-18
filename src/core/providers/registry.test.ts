import { describe, expect, it } from "vitest";
import { ByokError } from "./errors";
import { resolveModel } from "./registry";

describe("resolveModel", () => {
  it("resolves native providers to a model instance", () => {
    for (const provider of ["openai", "anthropic", "google"]) {
      const model = resolveModel({ provider, model: "some-model", apiKey: "k" });
      expect(model).toBeTypeOf("object");
    }
  });

  it("resolves openai-compatible providers using their default base URL", () => {
    const model = resolveModel({ provider: "groq", model: "llama-3.3-70b-versatile", apiKey: "k" });
    expect(model).toBeTypeOf("object");
  });

  it("throws unknown_provider for an unknown id", () => {
    try {
      resolveModel({ provider: "does-not-exist", model: "m", apiKey: "k" });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ByokError);
      expect((err as ByokError).code).toBe("unknown_provider");
    }
  });

  it("requires a base URL for the custom provider", () => {
    try {
      resolveModel({ provider: "custom", model: "m", apiKey: "k" });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ByokError);
      expect((err as ByokError).code).toBe("bad_base_url");
    }
  });
});
