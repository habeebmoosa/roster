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

export interface RunEvalInput {
  definition: AgentDefinition;
  tasks: EvalTask[];
  tiers: EvalTier[];
}

async function runCase(
  definition: AgentDefinition,
  model: LanguageModel,
  task: EvalTask,
): Promise<EvalCaseResult> {
  const start = Date.now();
  let output = "";
  let tokens = 0;
  try {
    const result = runAgent({
      definition,
      model,
      messages: [{ role: "user", content: task.input }],
    });
    output = await result.text;
    const usage = await result.usage;
    tokens = usage?.totalTokens ?? (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
  } catch {
    output = "";
  }
  const latencyMs = Date.now() - start;
  const { passed, failures } = grade(output, task.graders);
  return { taskId: task.id, passed, failures, tokens, latencyMs, output };
}

export async function runEvalTier(
  definition: AgentDefinition,
  tier: EvalTier,
  tasks: EvalTask[],
): Promise<EvalTierResult> {
  const cases: EvalCaseResult[] = [];
  for (const task of tasks) {
    cases.push(await runCase(definition, tier.model, task));
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
}: RunEvalInput): Promise<EvalTierResult[]> {
  const results: EvalTierResult[] = [];
  for (const tier of tiers) {
    results.push(await runEvalTier(definition, tier, tasks));
  }
  return results;
}
