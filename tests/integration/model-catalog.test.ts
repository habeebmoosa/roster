import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getProviderCatalog } from "@/core/providers/catalog";
import {
  listModelsForProvider,
  replaceModelsForProvider,
  type ModelCatalogRecord,
} from "@/server/db/repositories/model-catalog.repository";
import { prisma } from "@/server/db/prisma";
import { syncModelCatalogFromModelsDev } from "@/server/models/sync-service";

const TEST_PROVIDER = `test-provider-${Date.now()}`;

afterEach(async () => {
  await prisma.modelCatalog.deleteMany({ where: { provider: TEST_PROVIDER } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Regression guard for the class of bug reported live: catalog.ts's
 * `suggestedModels` are a static, hand-picked list, but they're also what
 * `addProviderKey`/`updateProviderCredential` (server/providers/service.ts)
 * silently validate a new credential against when the user doesn't type a
 * model themselves — so a stale entry (a provider has since retired/renamed
 * that model) surfaces as a confusing "That model wasn't found for this
 * provider" on Add Provider, not as a test failure, until now. This checks
 * every suggested model against the currently-synced (models.dev) catalog —
 * a real drift, not a mock, since the whole point is catching retirements.
 * Providers with no synced catalog at all (Ollama, custom, uncataloged ones)
 * have nothing to check against and are skipped.
 */
describe("catalog.ts suggestedModels — stay resolvable against the live-synced catalog", () => {
  it("every suggested model for every provider with a synced catalog still exists", async () => {
    const stale: string[] = [];
    for (const entry of getProviderCatalog()) {
      const synced = await listModelsForProvider(entry.id);
      if (synced.length === 0) continue; // nothing to check against (Ollama, custom, ...)
      const known = new Set(synced.map((m) => m.modelId));
      for (const suggested of entry.suggestedModels) {
        // Hugging Face's Inference Providers routing suffix (":cheapest",
        // ":together") isn't part of the underlying model id models.dev knows.
        const modelId = entry.id === "huggingface" ? suggested.split(":")[0]! : suggested;
        if (!known.has(modelId)) stale.push(`${entry.id} -> ${suggested}`);
      }
    }
    expect(stale).toEqual([]);
  });
});

function model(overrides: Partial<Parameters<typeof replaceModelsForProvider>[1][number]>) {
  return {
    modelId: "m-1",
    label: "Model One",
    description: null,
    contextWindow: null,
    maxOutputTokens: null,
    inputModalities: [],
    outputModalities: [],
    reasoningSupport: false,
    toolCallSupport: false,
    structuredOutputSupport: false,
    openWeights: false,
    inputPricePerMTok: null,
    outputPricePerMTok: null,
    cacheReadPricePerMTok: null,
    cacheWritePricePerMTok: null,
    knowledgeCutoff: null,
    releaseDate: null,
    ...overrides,
  };
}

describe("replaceModelsForProvider", () => {
  it("wholesale-replaces a provider's models.dev-sourced rows on each call", async () => {
    await replaceModelsForProvider(TEST_PROVIDER, [
      model({ modelId: "old-1" }),
      model({ modelId: "old-2" }),
    ]);
    expect((await listModelsForProvider(TEST_PROVIDER)).map((m) => m.modelId).sort()).toEqual([
      "old-1",
      "old-2",
    ]);

    await replaceModelsForProvider(TEST_PROVIDER, [model({ modelId: "new-1" })]);
    const after = await listModelsForProvider(TEST_PROVIDER);
    expect(after.map((m) => m.modelId)).toEqual(["new-1"]);
  });

  it("leaves manually-sourced rows untouched by a models.dev replace", async () => {
    await prisma.modelCatalog.create({
      data: {
        provider: TEST_PROVIDER,
        modelId: "hand-added",
        label: "Hand Added",
        source: "manual",
      },
    });

    await replaceModelsForProvider(TEST_PROVIDER, [model({ modelId: "synced-1" })]);

    const rows = await listModelsForProvider(TEST_PROVIDER);
    expect(rows.map((r) => r.modelId).sort()).toEqual(["hand-added", "synced-1"]);
    expect(rows.find((r) => r.modelId === "hand-added")?.source).toBe("manual");
  });

  it("clears every row when synced with an empty list (provider dropped from models.dev)", async () => {
    await replaceModelsForProvider(TEST_PROVIDER, [model({ modelId: "will-vanish" })]);
    await replaceModelsForProvider(TEST_PROVIDER, []);
    expect(await listModelsForProvider(TEST_PROVIDER)).toEqual([]);
  });
});

describe("syncModelCatalogFromModelsDev", () => {
  // syncModelCatalogFromModelsDev() iterates the REAL catalog (all 21
  // providers), and this suite runs against the same local dev DB as
  // `npm run models:sync` (no separate ephemeral test DB) — so calling the
  // real function with a small fixture response would otherwise wipe every
  // *other* real provider's synced rows too (extractModelsForProvider
  // correctly returns [] for a provider absent from the fixture, and
  // replaceModelsForProvider correctly deletes-to-empty on that). Snapshot
  // every provider's current rows first and restore them exactly afterward.
  let snapshot: Record<string, ModelCatalogRecord[]> = {};

  beforeAll(async () => {
    snapshot = {};
    for (const entry of getProviderCatalog()) {
      snapshot[entry.id] = await listModelsForProvider(entry.id);
    }
  });

  afterAll(async () => {
    for (const [provider, rows] of Object.entries(snapshot)) {
      await prisma.modelCatalog.deleteMany({ where: { provider } });
      if (rows.length > 0) {
        await prisma.modelCatalog.createMany({
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude `id` from `rest`
          data: rows.map(({ id, ...rest }) => rest),
        });
      }
    }
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          openai: {
            id: "openai",
            name: "OpenAI",
            models: {
              "gpt-5": {
                id: "gpt-5",
                name: "GPT-5",
                reasoning: true,
                tool_call: true,
                modalities: { input: ["text"], output: ["text"] },
                limit: { context: 400000, output: 128000 },
                cost: { input: 1.25, output: 10 },
              },
            },
          },
          anthropic: {
            id: "anthropic",
            name: "Anthropic",
            models: {
              "claude-sonnet-5": {
                id: "claude-sonnet-5",
                name: "Claude Sonnet 5",
                reasoning: true,
                tool_call: true,
                modalities: { input: ["text", "image"], output: ["text"] },
                limit: { context: 200000, output: 64000 },
                cost: { input: 3, output: 15 },
              },
            },
          },
          // Every other provider our catalog knows about is simply absent here —
          // extractModelsForProvider already handles that as an empty result.
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("syncs real catalog providers and skips Ollama/Custom entirely", async () => {
    const results = await syncModelCatalogFromModelsDev();

    const openaiResult = results.find((r) => r.provider === "openai");
    const anthropicResult = results.find((r) => r.provider === "anthropic");
    expect(openaiResult?.modelCount).toBe(1);
    expect(anthropicResult?.modelCount).toBe(1);
    expect(results.some((r) => r.provider === "ollama")).toBe(false);
    expect(results.some((r) => r.provider === "custom")).toBe(false);

    const stored = await listModelsForProvider("openai");
    expect(stored[0]).toMatchObject({ modelId: "gpt-5", contextWindow: 400000, source: "models.dev" });
  });

  it("throws if the models.dev fetch itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(syncModelCatalogFromModelsDev()).rejects.toThrow(/503/);
  });
});
