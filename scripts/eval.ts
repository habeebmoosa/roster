import "dotenv/config";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { checkGate, type EvalTier, runEval } from "@/core/eval";
import { loadBaseline, loadEvalSet } from "@/core/eval/loader";
import { resolveModel } from "@/core/providers";
import { MODEL_TIERS, type ModelTier } from "@/config/model-tiers";
import { prisma } from "@/server/db/prisma";
import { saveEvalRun } from "@/server/db/repositories/eval-run.repository";

/**
 * Eval CLI. Runs an agent's eval set through runAgent() across each configured
 * model tier, prints a table, and persists EvalRun rows.
 *
 * Configure tiers via env (any subset). For each TIER in FRONTIER/MID/CHEAP:
 *   EVAL_<TIER>_PROVIDER   catalog id (openai, anthropic, google, groq, custom…)
 *   EVAL_<TIER>_MODEL      model id
 *   EVAL_<TIER>_API_KEY    provider API key
 *   EVAL_<TIER>_BASE_URL   optional (for custom / openai-compatible)
 *
 * Usage:  npm run eval [-- --agent customer-support] [--gate]
 */
const AGENT_ID = argValue("--agent") ?? "customer-support";
const GATE = process.argv.includes("--gate");

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function tierFromEnv(tier: ModelTier): EvalTier | null {
  const prefix = `EVAL_${tier.toUpperCase()}`;
  const provider = process.env[`${prefix}_PROVIDER`];
  const model = process.env[`${prefix}_MODEL`];
  const apiKey = process.env[`${prefix}_API_KEY`];
  const baseUrl = process.env[`${prefix}_BASE_URL`];
  if (!provider || !model || !apiKey) return null;
  return {
    tier,
    modelLabel: `${provider}:${model}`,
    model: resolveModel({ provider, model, apiKey, baseUrl }),
  };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

async function main() {
  const definition = loadAgentDefinitionFile(`agents/${AGENT_ID}/agent.yaml`);
  const set = loadEvalSet(`evals/${AGENT_ID}.json`);

  const tiers = MODEL_TIERS.map(tierFromEnv).filter((t): t is EvalTier => t !== null);
  if (tiers.length === 0) {
    console.error(
      "No eval tiers configured. Set EVAL_<FRONTIER|MID|CHEAP>_PROVIDER/MODEL/API_KEY (see .env.example).",
    );
    process.exit(1);
  }

  console.log(
    `\nRunning eval "${AGENT_ID}" (${set.tasks.length} tasks) across ${tiers.length} tier(s)…\n`,
  );
  const results = await runEval({ definition, tasks: set.tasks, tiers });

  console.log("tier      model                     pass/total  success   avg tokens  avg latency");
  console.log("─".repeat(84));
  for (const r of results) {
    console.log(
      `${r.tier.padEnd(9)} ${r.modelLabel.slice(0, 24).padEnd(25)} ` +
        `${`${r.passed}/${r.total}`.padEnd(11)} ${pct(r.successRate).padEnd(9)} ` +
        `${r.avgTokens.toFixed(0).padEnd(11)} ${r.avgLatencyMs.toFixed(0)}ms`,
    );
    await saveEvalRun(AGENT_ID, r);
  }
  console.log("");

  if (GATE) {
    const gate = checkGate(AGENT_ID, results, loadBaseline("evals/baseline.json"));
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
