import "dotenv/config";
import { prisma } from "@/server/db/prisma";
import { syncModelCatalogFromModelsDev } from "@/server/models/sync-service";

/**
 * Syncs the model catalog (context window, pricing, modalities, reasoning/tool
 * support) for every provider from models.dev. Run manually (`npm run
 * models:sync`) or via the scheduled route (app/api/cron/sync-model-catalog) —
 * this is shared, global metadata, never fetched on a user's request path.
 */
async function main() {
  console.log("Syncing model catalog from models.dev…");
  const results = await syncModelCatalogFromModelsDev();

  const width = Math.max(...results.map((r) => r.provider.length));
  for (const { provider, modelCount } of results) {
    console.log(`  ${provider.padEnd(width)}  ${modelCount} models`);
  }
  console.log(`Synced ${results.length} provider(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
