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

  it("resolves the new plain-bearer native providers to a model instance", () => {
    for (const provider of [
      "cohere",
      "perplexity",
      "fireworks",
      "cerebras",
      "deepinfra",
      "huggingface",
      "openrouter",
    ]) {
      const model = resolveModel({ provider, model: "some-model", apiKey: "k" });
      expect(model).toBeTypeOf("object");
    }
  });

  describe("azure", () => {
    it("resolves given a resourceName in config", () => {
      const model = resolveModel({
        provider: "azure",
        model: "my-deployment",
        apiKey: "k",
        config: { resourceName: "my-resource", apiVersion: "2024-10-01" },
      });
      expect(model).toBeTypeOf("object");
    });

    it("resolves given a base URL instead of a resourceName", () => {
      const model = resolveModel({
        provider: "azure",
        model: "my-deployment",
        apiKey: "k",
        baseUrl: "https://my-gateway.example.com",
      });
      expect(model).toBeTypeOf("object");
    });

    it("throws missing_required_field with neither a resourceName nor a base URL", () => {
      try {
        resolveModel({ provider: "azure", model: "my-deployment", apiKey: "k" });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ByokError);
        expect((err as ByokError).code).toBe("missing_required_field");
      }
    });
  });

  describe("amazon-bedrock", () => {
    it("resolves given a region and a JSON-encoded access/secret key bundle", () => {
      const model = resolveModel({
        provider: "amazon-bedrock",
        model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        apiKey: JSON.stringify({ accessKeyId: "AKIA...", secretAccessKey: "secret" }),
        config: { region: "us-east-1" },
      });
      expect(model).toBeTypeOf("object");
    });

    it("throws missing_required_field without a region", () => {
      try {
        resolveModel({
          provider: "amazon-bedrock",
          model: "m",
          apiKey: JSON.stringify({ accessKeyId: "a", secretAccessKey: "b" }),
        });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ByokError);
        expect((err as ByokError).code).toBe("missing_required_field");
      }
    });

    it("throws missing_required_field when the credential bundle isn't valid JSON", () => {
      try {
        resolveModel({
          provider: "amazon-bedrock",
          model: "m",
          apiKey: "not-json",
          config: { region: "us-east-1" },
        });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ByokError);
        expect((err as ByokError).code).toBe("missing_required_field");
      }
    });
  });

  describe("google-vertex", () => {
    it("resolves given project, location, and a JSON-encoded service-account bundle", () => {
      const model = resolveModel({
        provider: "google-vertex",
        model: "gemini-2.5-pro",
        apiKey: JSON.stringify({ clientEmail: "svc@project.iam.gserviceaccount.com", privateKey: "-----BEGIN..." }),
        config: { project: "my-project", location: "us-central1" },
      });
      expect(model).toBeTypeOf("object");
    });

    it("throws missing_required_field without a project or location", () => {
      try {
        resolveModel({
          provider: "google-vertex",
          model: "m",
          apiKey: JSON.stringify({ apiKey: "express-mode-key" }),
          config: { project: "my-project" }, // location missing
        });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ByokError);
        expect((err as ByokError).code).toBe("missing_required_field");
      }
    });
  });
});
