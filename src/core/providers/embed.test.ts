import { describe, expect, it } from "vitest";
import { ByokError } from "./errors";
import { isEmbeddingCapable, padEmbedding, resolveEmbeddingModel } from "./embed";

describe("isEmbeddingCapable", () => {
  it("is true for openai and google", () => {
    expect(isEmbeddingCapable("openai")).toBe(true);
    expect(isEmbeddingCapable("google")).toBe(true);
  });

  it("is false for providers with no embedding model (anthropic, custom, unknown)", () => {
    expect(isEmbeddingCapable("anthropic")).toBe(false);
    expect(isEmbeddingCapable("custom")).toBe(false);
    expect(isEmbeddingCapable("does-not-exist")).toBe(false);
  });
});

describe("padEmbedding", () => {
  it("returns the vector unchanged when it already matches the target", () => {
    expect(padEmbedding([1, 2, 3], 3)).toEqual([1, 2, 3]);
  });

  it("zero-pads a shorter vector up to the target width", () => {
    expect(padEmbedding([1, 2], 5)).toEqual([1, 2, 0, 0, 0]);
  });

  it("throws if the vector is longer than the target", () => {
    expect(() => padEmbedding([1, 2, 3, 4], 2)).toThrow(/exceeding target/);
  });

  it("preserves cosine similarity between two equally-padded vectors", () => {
    const a = padEmbedding([1, 0], 4);
    const b = padEmbedding([1, 1], 4);
    const dot = a.reduce((sum, v, i) => sum + v * b[i]!, 0);
    const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
    const cosine = dot / (normA * normB);
    // cos([1,0],[1,1]) = 1/sqrt(2) — unaffected by the shared zero-padding.
    expect(cosine).toBeCloseTo(1 / Math.sqrt(2), 10);
  });
});

describe("resolveEmbeddingModel", () => {
  it("throws embeddings_unsupported for a provider with no embedding model", () => {
    expect(() => resolveEmbeddingModel({ provider: "anthropic", apiKey: "sk-test" })).toThrow(
      ByokError,
    );
    try {
      resolveEmbeddingModel({ provider: "anthropic", apiKey: "sk-test" });
    } catch (err) {
      expect((err as ByokError).code).toBe("embeddings_unsupported");
    }
  });

  it("resolves an embedding model instance for openai and google", () => {
    expect(resolveEmbeddingModel({ provider: "openai", apiKey: "sk-test" })).toBeTruthy();
    expect(resolveEmbeddingModel({ provider: "google", apiKey: "sk-test" })).toBeTruthy();
  });
});
