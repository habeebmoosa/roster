import type { LanguageModel } from "ai";
import { type AgentDefinition, runAgent } from "@/core/agent";
import type { ModelPricing, ModelTier } from "@/config/model-tiers";
import { grade } from "./graders";
import type { EvalCaseResult, EvalTask, EvalTierResult } from "./types";

export interface EvalTier {
  tier: ModelTier;
  modelLabel: string;
  model: LanguageModel;
  /** Omit when the tier's model has no known per-token pricing. */
  pricing?: ModelPricing;
}

function computeCostUsd(
  inputTokens: number,
  outputTokens: number,
  pricing?: ModelPricing,
): number | undefined {
  if (!pricing) return undefined;
  return (
    (inputTokens / 1_000_000) * pricing.inputPerMTok +
    (outputTokens / 1_000_000) * pricing.outputPerMTok
  );
}

export interface RetrievalResult {
  text: string;
  sourceUris: string[];
}

/**
 * Injected retrieval dependency — keeps this module DB-free (same pattern as
 * `model`: the caller resolves real credentials/DB access and hands in a
 * ready-to-call function). Receives the tier's own model so re-ranking
 * matches exactly what streamAgentChat() does in production.
 */
export type RetrieveFn = (query: string, model: LanguageModel) => Promise<RetrievalResult>;

export interface RunEvalInput {
  definition: AgentDefinition;
  tasks: EvalTask[];
  tiers: EvalTier[];
  retrieve?: RetrieveFn;
}

async function runCase(
  definition: AgentDefinition,
  model: LanguageModel,
  task: EvalTask,
  retrieve?: RetrieveFn,
  pricing?: ModelPricing,
): Promise<EvalCaseResult> {
  const start = Date.now();
  let output = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let retrievedSourceUris: string[] | undefined;
  try {
    let retrievedContext: string | undefined;
    if (retrieve) {
      const retrieval = await retrieve(task.input, model);
      retrievedContext = retrieval.text || undefined;
      retrievedSourceUris = retrieval.sourceUris;
    }
    const result = await runAgent({
      definition,
      model,
      messages: [{ role: "user", content: task.input }],
      retrievedContext,
      // Same fn, reused for the multi-step path's own per-step retrieval —
      // the upfront call above only ever grounds the single-step bypass.
      retrieve,
    });
    output = await result.text;
    const usage = await result.usage;
    inputTokens = usage.inputTokens;
    outputTokens = usage.outputTokens;
    // The multi-step workflow path retrieves per-step and reports its own
    // (possibly broader) union of sources — prefer it when present.
    if (result.retrievedSourceUris) {
      retrievedSourceUris = result.retrievedSourceUris;
    }
  } catch {
    output = "";
  }
  const latencyMs = Date.now() - start;
  const costUsd = computeCostUsd(inputTokens, outputTokens, pricing);
  const { passed, failures } = grade(output, task.graders, { retrievedSourceUris });
  return {
    taskId: task.id,
    passed,
    failures,
    tokens: inputTokens + outputTokens,
    inputTokens,
    outputTokens,
    costUsd,
    latencyMs,
    output,
    retrievedSourceUris,
  };
}

export async function runEvalTier(
  definition: AgentDefinition,
  tier: EvalTier,
  tasks: EvalTask[],
  retrieve?: RetrieveFn,
): Promise<EvalTierResult> {
  const cases: EvalCaseResult[] = [];
  for (const task of tasks) {
    cases.push(await runCase(definition, tier.model, task, retrieve, tier.pricing));
  }
  const total = cases.length;
  const passed = cases.filter((c) => c.passed).length;
  const average = (select: (c: EvalCaseResult) => number) =>
    total === 0 ? 0 : cases.reduce((sum, c) => sum + select(c), 0) / total;

  return {
    tier: tier.tier,
    modelLabel: tier.modelLabel,
    total,
    passed,
    successRate: total === 0 ? 0 : passed / total,
    avgTokens: average((c) => c.tokens),
    avgLatencyMs: average((c) => c.latencyMs),
    avgCostUsd: average((c) => c.costUsd ?? 0),
    cases,
  };
}

/** Run an eval set through runAgent() across each configured model tier. */
export async function runEval({
  definition,
  tasks,
  tiers,
  retrieve,
}: RunEvalInput): Promise<EvalTierResult[]> {
  const results: EvalTierResult[] = [];
  for (const tier of tiers) {
    results.push(await runEvalTier(definition, tier, tasks, retrieve));
  }
  return results;
}
