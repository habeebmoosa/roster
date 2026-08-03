import { getProviderCatalog } from "@/core/providers/catalog";
import {
  extractModelsForProvider,
  UNCATALOGED_PROVIDERS,
  type ModelsDevCatalog,
} from "@/core/models/models-dev";
import { replaceModelsForProvider } from "@/server/db/repositories/model-catalog.repository";

const MODELS_DEV_URL = "https://models.dev/api.json";

export interface SyncResult {
  provider: string;
  modelCount: number;
}

/**
 * Fetches models.dev's full catalog once and syncs every eligible catalog
 * provider from it (skips Ollama/Custom — see UNCATALOGED_PROVIDERS). Meant
 * to run on a schedule (see app/api/cron/sync-model-catalog), not per-request —
 * this is shared, global metadata, not something a user's chat turn should
 * ever wait on.
 */
export async function syncModelCatalogFromModelsDev(): Promise<SyncResult[]> {
  const res = await fetch(MODELS_DEV_URL);
  if (!res.ok) {
    throw new Error(`models.dev fetch failed: HTTP ${res.status}`);
  }
  const catalog = (await res.json()) as ModelsDevCatalog;

  const results: SyncResult[] = [];
  for (const entry of getProviderCatalog()) {
    if (UNCATALOGED_PROVIDERS.includes(entry.id)) continue;
    const models = extractModelsForProvider(catalog, entry.id);
    const modelCount = await replaceModelsForProvider(entry.id, models);
    results.push({ provider: entry.id, modelCount });
  }
  return results;
}
