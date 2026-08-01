import "dotenv/config";
import { preserveRuntimeModel } from "@/core/agent";
import { getAgentDefinition, upsertAgent } from "@/server/db/repositories/agent.repository";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { prisma } from "@/server/db/prisma";
import { getEmbeddingResolveInputForUser } from "@/server/providers/service";
import { ingestAgentKnowledge } from "@/server/knowledge/ingest";

/**
 * Knowledge ingestion CLI (Phase 7). Chunks + embeds + stores an agent's
 * knowledge docs and playbooks, using a user's saved BYOK embedding-capable
 * provider (OpenAI or Google).
 *
 * Usage: npm run ingest -- --agent customer-support [--user <userId>]
 * If --user is omitted, the first user in the database is used (dev
 * convenience — pick an explicit --user for anything beyond local testing).
 */
const AGENT_ID = argValue("--agent") ?? "customer-support";
const USER_ID = argValue("--user");

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const agentDir = `agents/${AGENT_ID}`;

  // Re-seed from YAML so ingestion always reflects the current definition on
  // disk — but keep whatever default model is already configured at runtime
  // (the YAML spec never sets one; see preserveRuntimeModel).
  const existing = await getAgentDefinition(AGENT_ID);
  const fresh = loadAgentDefinitionFile(`${agentDir}/agent.yaml`);
  await upsertAgent(preserveRuntimeModel(fresh, existing));
  const definition = await getAgentDefinition(AGENT_ID);
  if (!definition) throw new Error(`Agent "${AGENT_ID}" not found after seeding.`);

  const userId = USER_ID ?? (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }))?.id;
  if (!userId) {
    console.error("No user found — sign in once, or connect a provider, then retry.");
    process.exit(1);
  }

  console.log(`\nIngesting "${AGENT_ID}" from ${agentDir} (as user ${userId})...\n`);
  const embedInput = await getEmbeddingResolveInputForUser(userId);
  console.log(`Using embedding provider: ${embedInput.provider}\n`);

  const results = await ingestAgentKnowledge({ definition, agentDir, embedInput });

  for (const result of results) {
    console.log(`  ${result.sourceUri.padEnd(40)} ${result.chunksIngested} chunk(s)`);
  }
  console.log(
    `\nIngested ${results.length} source(s), ${results.reduce((s, r) => s + r.chunksIngested, 0)} chunk(s) total.\n`,
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
