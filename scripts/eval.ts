import "dotenv/config";
import type { LanguageModel } from "ai";
import { type AgentDefinition } from "@/core/agent";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { checkGate, type EvalTier, type RetrieveFn, runEval } from "@/core/eval";
import { loadBaseline, loadEvalSet } from "@/core/eval/loader";
import { resolveModel } from "@/core/providers";
import {
  MODEL_TIER_DEFAULTS,
  MODEL_TIERS,
  type ModelPricing,
  type ModelTier,
} from "@/config/model-tiers";
import { countKnowledgeForAgent } from "@/server/db/repositories/agent-knowledge.repository";
import { prisma } from "@/server/db/prisma";
import { saveEvalRun } from "@/server/db/repositories/eval-run.repository";
import { retrieveGroundingContext } from "@/server/retrieval/grounding";

/**
 * Eval CLI. Runs an agent's eval set through runAgent() across each configured
 * model tier, prints a table, and persists EvalRun rows.
 *
 * Configure tiers via env (any subset). For each TIER in FRONTIER/MID/CHEAP,
 * only API_KEY is strictly required — PROVIDER/MODEL default to Anthropic
 * (see MODEL_TIER_DEFAULTS) so a tier activates with zero setup beyond a key:
 *   EVAL_<TIER>_PROVIDER   catalog id (openai, anthropic, google, groq, custom…) — default: anthropic
 *   EVAL_<TIER>_MODEL      model id — default: per-tier Anthropic model (see MODEL_TIER_DEFAULTS)
 *   EVAL_<TIER>_API_KEY    provider API key (required to activate this tier)
 *   EVAL_<TIER>_BASE_URL   optional (for custom / openai-compatible)
 *   EVAL_<TIER>_INPUT_PRICE_PER_MTOK / _OUTPUT_PRICE_PER_MTOK
 *                          optional USD/1M-token overrides. Only needed if you
 *                          override PROVIDER/MODEL away from the default —
 *                          without them an overridden model reports no cost
 *                          rather than a misleading guessed number.
 *
 * Optional, for agents with a knowledge base (Phase 7): configure
 * EVAL_EMBEDDING_PROVIDER/API_KEY/BASE_URL (openai | google only) so grounded
 * tasks (graders with type "retrieval") actually retrieve — requires the KB
 * already ingested with this SAME provider (`npm run ingest`).
 *
 * The eval set (task file + baseline key) defaults to the agent id, but can
 * be overridden with --evalset to run an alternate task file against the same
 * agent — e.g. the customer-support-grounded.json set that specifically
 * exercises retrieval, kept separate from the default set so CI/gate runs
 * without embedding credentials configured don't fail on unrelated tasks.
 *
 * Usage:  npm run eval [-- --agent customer-support] [--evalset customer-support-grounded] [--gate]
 */
const AGENT_ID = argValue("--agent") ?? "customer-support";
const EVAL_SET = argValue("--evalset") ?? AGENT_ID;
const GATE = process.argv.includes("--gate");

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function numFromEnv(key: string): number | undefined {
  const raw = process.env[key];
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function tierFromEnv(tier: ModelTier): EvalTier | null {
  const prefix = `EVAL_${tier.toUpperCase()}`;
  const defaults = MODEL_TIER_DEFAULTS[tier];
  const provider = process.env[`${prefix}_PROVIDER`] ?? defaults.provider;
  const model = process.env[`${prefix}_MODEL`] ?? defaults.model;
  const apiKey = process.env[`${prefix}_API_KEY`];
  const baseUrl = process.env[`${prefix}_BASE_URL`];
  if (!apiKey) return null;

  // Only apply the built-in price table when the resolved provider/model
  // still match the default — an overridden model needs its own explicit
  // price env vars, or cost simply isn't reported (never guessed).
  const usingDefaultModel = provider === defaults.provider && model === defaults.model;
  const inputPerMTok =
    numFromEnv(`${prefix}_INPUT_PRICE_PER_MTOK`) ??
    (usingDefaultModel ? defaults.pricing.inputPerMTok : undefined);
  const outputPerMTok =
    numFromEnv(`${prefix}_OUTPUT_PRICE_PER_MTOK`) ??
    (usingDefaultModel ? defaults.pricing.outputPerMTok : undefined);
  const pricing: ModelPricing | undefined =
    inputPerMTok !== undefined && outputPerMTok !== undefined
      ? { inputPerMTok, outputPerMTok }
      : undefined;

  return {
    tier,
    modelLabel: `${provider}:${model}`,
    model: resolveModel({ provider, model, apiKey, baseUrl }),
    pricing,
  };
}

/** Builds the retrieve function eval cases use, if the agent has a KB and embedding creds are set. */
async function buildRetrieveFn(
  agentId: string,
  definition: AgentDefinition,
): Promise<RetrieveFn | undefined> {
  const hasKnowledge =
    definition.memory.semantic.length > 0 || definition.memory.procedural.length > 0;
  if (!hasKnowledge) return undefined;

  const provider = process.env.EVAL_EMBEDDING_PROVIDER;
  const apiKey = process.env.EVAL_EMBEDDING_API_KEY;
  const baseUrl = process.env.EVAL_EMBEDDING_BASE_URL;
  if (!provider || !apiKey) {
    console.warn(
      `⚠️  Agent "${agentId}" has a knowledge base, but EVAL_EMBEDDING_PROVIDER/API_KEY isn't ` +
        `set — grounded tasks will run ungrounded and any "retrieval" grader will fail.\n`,
    );
    return undefined;
  }

  const chunkCount = await countKnowledgeForAgent(agentId);
  if (chunkCount === 0) {
    console.warn(
      `⚠️  Agent "${agentId}" has no ingested knowledge yet — run \`npm run ingest -- --agent ` +
        `${agentId}\` first, or grounded tasks will retrieve nothing.\n`,
    );
  }

  const embedInput = { provider, apiKey, baseUrl };
  return async (query: string, model: LanguageModel) => {
    const assembled = await retrieveGroundingContext({
      agentId,
      query,
      embedInput,
      model,
      budgetTokens: definition.context_budget_tokens,
    });
    return { text: assembled.text, sourceUris: assembled.usedSourceUris };
  };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function cost(n: number): string {
  return n > 0 ? `$${n.toFixed(4)}` : "—";
}

async function main() {
  const definition = loadAgentDefinitionFile(`agents/${AGENT_ID}/agent.yaml`);
  const set = loadEvalSet(`evals/${EVAL_SET}.json`);

  const tiers = MODEL_TIERS.map(tierFromEnv).filter((t): t is EvalTier => t !== null);
  if (tiers.length === 0) {
    console.error(
      "No eval tiers configured. Set EVAL_<FRONTIER|MID|CHEAP>_API_KEY (provider/model default to Anthropic — see .env.example).",
    );
    process.exit(1);
  }

  const retrieve = await buildRetrieveFn(AGENT_ID, definition);

  console.log(
    `\nRunning eval set "${EVAL_SET}" for agent "${AGENT_ID}" (${set.tasks.length} tasks) ` +
      `across ${tiers.length} tier(s)${retrieve ? ", with retrieval" : ""}…\n`,
  );
  const results = await runEval({ definition, tasks: set.tasks, tiers, retrieve });

  console.log(
    "tier      model                     pass/total  success   avg tokens  avg cost    avg latency",
  );
  console.log("─".repeat(96));
  for (const r of results) {
    console.log(
      `${r.tier.padEnd(9)} ${r.modelLabel.slice(0, 24).padEnd(25)} ` +
        `${`${r.passed}/${r.total}`.padEnd(11)} ${pct(r.successRate).padEnd(9)} ` +
        `${r.avgTokens.toFixed(0).padEnd(11)} ${cost(r.avgCostUsd).padEnd(11)} ${r.avgLatencyMs.toFixed(0)}ms`,
    );
    for (const c of r.cases) {
      if (c.passed) continue;
      console.log(`   ✗ ${c.taskId}: ${c.failures.join("; ")}`);
    }
    await saveEvalRun(EVAL_SET, r);
  }
  console.log("");

  if (GATE) {
    const gate = checkGate(EVAL_SET, results, loadBaseline("evals/baseline.json"));
    if (!gate.ok) {
      console.error("❌ Eval gate FAILED — success rate regressed below baseline:");
      for (const reg of gate.regressions) {
        console.error(`   ${reg.tier}: ${pct(reg.actual)} < baseline ${pct(reg.baseline)}`);
      }
      await prisma.$disconnect();
      process.exit(1);
    }
    console.log("✅ Eval gate passed.\n");
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
