import { describe, expect, it } from "vitest";
import {
  extractModelsForProvider,
  modelsDevKeyForProvider,
  UNCATALOGED_PROVIDERS,
  type ModelsDevCatalog,
} from "./models-dev";

const FIXTURE: ModelsDevCatalog = {
  openai: {
    id: "openai",
    name: "OpenAI",
    models: {
      "gpt-5": {
        id: "gpt-5",
        name: "GPT-5",
        description: "Flagship reasoning model",
        reasoning: true,
        tool_call: true,
        structured_output: true,
        open_weights: false,
        modalities: { input: ["text", "image"], output: ["text"] },
        limit: { context: 400000, input: 272000, output: 128000 },
        cost: { input: 1.25, output: 10, cache_read: 0.125 },
        knowledge: "2024-09-30",
        release_date: "2025-08-07",
      },
      "gpt-image-2": {
        // No cost, no limit at all — some models.dev entries genuinely omit these.
        id: "gpt-image-2",
        name: "gpt-image-2",
        modalities: { input: ["text", "image"], output: ["image"] },
      },
    },
  },
  "fireworks-ai": {
    id: "fireworks-ai",
    name: "Fireworks",
    models: {
      "kimi-k2": {
        id: "accounts/fireworks/models/kimi-k2",
        name: "Kimi K2",
        reasoning: false,
        tool_call: true,
        modalities: { input: ["text"], output: ["text"] },
        limit: { context: 128000, output: 8192 },
        cost: { input: 0.6, output: 2.5 },
      },
    },
  },
};

describe("modelsDevKeyForProvider", () => {
  it("maps the three ids that differ from models.dev's own slug", () => {
    expect(modelsDevKeyForProvider("together")).toBe("togetherai");
    expect(modelsDevKeyForProvider("fireworks")).toBe("fireworks-ai");
    expect(modelsDevKeyForProvider("nvidia-nim")).toBe("nvidia");
  });

  it("passes every other id through unchanged", () => {
    expect(modelsDevKeyForProvider("openai")).toBe("openai");
    expect(modelsDevKeyForProvider("amazon-bedrock")).toBe("amazon-bedrock");
  });
});

describe("extractModelsForProvider", () => {
  it("normalizes every field for a fully-populated model", () => {
    const [gpt5] = extractModelsForProvider(FIXTURE, "openai").filter((m) => m.modelId === "gpt-5");
    expect(gpt5).toEqual({
      modelId: "gpt-5",
      label: "GPT-5",
      description: "Flagship reasoning model",
      contextWindow: 400000,
      maxOutputTokens: 128000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      reasoningSupport: true,
      toolCallSupport: true,
      structuredOutputSupport: true,
      openWeights: false,
      inputPricePerMTok: 1.25,
      outputPricePerMTok: 10,
      cacheReadPricePerMTok: 0.125,
      cacheWritePricePerMTok: null,
      knowledgeCutoff: "2024-09-30",
      releaseDate: "2025-08-07",
    });
  });

  it("defaults every optional field to null/false when models.dev omits it", () => {
    const models = extractModelsForProvider(FIXTURE, "openai");
    const image = models.find((m) => m.modelId === "gpt-image-2")!;
    expect(image.contextWindow).toBeNull();
    expect(image.maxOutputTokens).toBeNull();
    expect(image.reasoningSupport).toBe(false);
    expect(image.toolCallSupport).toBe(false);
    expect(image.inputPricePerMTok).toBeNull();
    expect(image.description).toBeNull();
  });

  it("resolves through the provider-id mapping (fireworks -> fireworks-ai)", () => {
    const models = extractModelsForProvider(FIXTURE, "fireworks");
    expect(models).toHaveLength(1);
    expect(models[0]!.modelId).toBe("accounts/fireworks/models/kimi-k2");
  });

  it("returns an empty array for a provider not present in the catalog, not an error", () => {
    expect(extractModelsForProvider(FIXTURE, "anthropic")).toEqual([]);
    expect(extractModelsForProvider(FIXTURE, "ollama")).toEqual([]);
  });
});

describe("UNCATALOGED_PROVIDERS", () => {
  it("lists exactly Ollama and Custom — the two with no models.dev coverage", () => {
    expect(UNCATALOGED_PROVIDERS).toEqual(["ollama", "custom"]);
  });
});
