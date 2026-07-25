import type { LanguageModel } from "ai";
import { type AgentDefinition, runAgent } from "@/core/agent";
import type { ModelTier } from "@/config/model-tiers";
import { grade } from "./graders";
import type { EvalCaseResult, EvalTask, EvalTierResult } from "./types";

export interface EvalTier {
  tier: ModelTier;
  modelLabel: string;
  model: LanguageModel;
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
): Promise<EvalCaseResult> {
  const start = Date.now();
  let output = "";
  let tokens = 0;
  let retrievedSourceUris: string[] | undefined;
  try {
    let retrievedContext: string | undefined;
    if (retrieve) {
      const retrieval = await retrieve(task.input, model);
      retrievedContext = retrieval.text || undefined;
      retrievedSourceUris = retrieval.sourceUris;
    }
    const result = runAgent({
      definition,
      model,
      messages: [{ role: "user", content: task.input }],
      retrievedContext,
    });
    output = await result.text;
    const usage = await result.usage;
    tokens = usage?.totalTokens ?? (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
  } catch {
    output = "";
  }
  const latencyMs = Date.now() - start;
  const { passed, failures } = grade(output, task.graders, { retrievedSourceUris });
  return { taskId: task.id, passed, failures, tokens, latencyMs, output, retrievedSourceUris };
}

export async function runEvalTier(
  definition: AgentDefinition,
  tier: EvalTier,
  tasks: EvalTask[],
  retrieve?: RetrieveFn,
): Promise<EvalTierResult> {
  const cases: EvalCaseResult[] = [];
  for (const task of tasks) {
    cases.push(await runCase(definition, tier.model, task, retrieve));
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
