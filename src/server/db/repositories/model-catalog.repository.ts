import { prisma } from "@/server/db/prisma";
import type { NormalizedModel } from "@/core/models/models-dev";

export interface ModelCatalogRecord {
  id: string;
  provider: string;
  modelId: string;
  label: string;
  description: string | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  reasoningSupport: boolean;
  toolCallSupport: boolean;
  structuredOutputSupport: boolean;
  openWeights: boolean;
  inputPricePerMTok: number | null;
  outputPricePerMTok: number | null;
  cacheReadPricePerMTok: number | null;
  cacheWritePricePerMTok: number | null;
  knowledgeCutoff: string | null;
  releaseDate: string | null;
  source: string;
  lastSyncedAt: Date;
}

export function listModelsForProvider(provider: string): Promise<ModelCatalogRecord[]> {
  return prisma.modelCatalog.findMany({ where: { provider }, orderBy: { modelId: "asc" } });
}

export interface ModelPricing {
  inputPricePerMTok: number | null;
  outputPricePerMTok: number | null;
}

/** A model's per-token pricing, for computing real usage cost — null if the model isn't in the catalog at all (a custom/self-hosted or uncatalogued model has no market price to look up). */
export async function getModelPricing(
  provider: string,
  modelId: string,
): Promise<ModelPricing | null> {
  const row = await prisma.modelCatalog.findUnique({
    where: { provider_modelId: { provider, modelId } },
    select: { inputPricePerMTok: true, outputPricePerMTok: true },
  });
  return row;
}

/**
 * Wholesale-replaces a provider's models.dev-sourced rows with a fresh set —
 * a sync re-fetches that provider's *current* catalog, it doesn't patch
 * individual rows, so delete-then-recreate is simpler and correct than a
 * per-row upsert (Prisma has no native bulk-upsert). Rows with a different
 * `source` (e.g. a future manual override) are untouched.
 */
export async function replaceModelsForProvider(
  provider: string,
  models: NormalizedModel[],
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    await tx.modelCatalog.deleteMany({ where: { provider, source: "models.dev" } });
    if (models.length === 0) return 0;
    const result = await tx.modelCatalog.createMany({
      data: models.map((m) => ({
        provider,
        modelId: m.modelId,
        label: m.label,
        description: m.description,
        contextWindow: m.contextWindow,
        maxOutputTokens: m.maxOutputTokens,
        inputModalities: m.inputModalities,
        outputModalities: m.outputModalities,
        reasoningSupport: m.reasoningSupport,
        toolCallSupport: m.toolCallSupport,
        structuredOutputSupport: m.structuredOutputSupport,
        openWeights: m.openWeights,
        inputPricePerMTok: m.inputPricePerMTok,
        outputPricePerMTok: m.outputPricePerMTok,
        cacheReadPricePerMTok: m.cacheReadPricePerMTok,
        cacheWritePricePerMTok: m.cacheWritePricePerMTok,
        knowledgeCutoff: m.knowledgeCutoff,
        releaseDate: m.releaseDate,
        source: "models.dev",
      })),
    });
    return result.count;
  });
}
