import { describe, expect, it } from "vitest";
import { getProviderCatalog } from "./catalog";

const catalog = getProviderCatalog();

describe("provider catalog", () => {
  it("has a unique, non-empty id and label for every entry", () => {
    const ids = catalog.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of catalog) {
      expect(entry.id.trim()).not.toBe("");
      expect(entry.label.trim()).not.toBe("");
    }
  });

  it("requiresApiKey is false only for a provider with zero secret fields (Ollama)", () => {
    for (const entry of catalog) {
      const secretFields = entry.fields.filter((f) => f.kind === "secret");
      if (entry.requiresApiKey) {
        expect(secretFields.length).toBeGreaterThan(0);
      } else {
        expect(secretFields).toHaveLength(0);
        expect(entry.id).toBe("ollama");
      }
    }
  });

  it("every secret field has a non-empty key and label", () => {
    for (const entry of catalog) {
      for (const field of entry.fields) {
        expect(field.key.trim()).not.toBe("");
        expect(field.label.trim()).not.toBe("");
      }
    }
  });

  it("a select field always lists at least one option", () => {
    for (const entry of catalog) {
      for (const field of entry.fields) {
        if (field.kind === "select") {
          expect(field.options?.length ?? 0).toBeGreaterThan(0);
        }
      }
    }
  });

  it("Ollama requires a base URL (there's no hosted default to fall back to)", () => {
    const ollama = catalog.find((c) => c.id === "ollama");
    expect(ollama?.requiresBaseUrl).toBe(true);
    expect(ollama?.defaultBaseUrl).toBeTruthy();
  });

  it("multi-secret enterprise providers (Bedrock, Vertex) don't also carry a bare top-level apiKey field", () => {
    for (const id of ["amazon-bedrock", "google-vertex"]) {
      const entry = catalog.find((c) => c.id === id)!;
      expect(entry.fields.find((f) => f.key === "apiKey")).toBeUndefined();
    }
  });
});
