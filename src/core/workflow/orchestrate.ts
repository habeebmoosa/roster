import type { LanguageModel } from "ai";
import type { WorkflowPlan } from "./decompose";
import type { StepRetrieveFn } from "./executor";
import { rollbackToSingleStep, runStepWithRetry } from "./retry";
import { compressStepOutput } from "./compress";

export interface WorkflowUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Step-boundary events for the future Phase 10 chat UI to render live progress. */
export type WorkflowStepEvent =
  | { type: "step-start"; index: number; goal: string }
  | { type: "step-complete"; index: number; passed: boolean; attempts: number }
  | { type: "rollback" };

export interface RunWorkflowInput {
  model: LanguageModel;
  plan: WorkflowPlan;
  /** The original, whole task — used only if rollback is needed. */
  task: string;
  /** The persona system prompt to use for every step, built once by the caller (core/agent). */
  systemPrompt: string;
  /** The token budget a step's output must fit into once compressed for the next step. */
  contextBudgetTokens: number;
  retrieve?: StepRetrieveFn;
  /** Model that judges groundedness — independent of `model`'s own output, never self-critique. Omit to skip that check. */
  groundednessModel?: LanguageModel;
  onStepEvent?: (event: WorkflowStepEvent) => void;
}

export interface RunWorkflowResult {
  text: string;
  usage: WorkflowUsage;
  /** True if the plan's final step (or its rollback) never passed validation. */
  failed: boolean;
  /** Union of every step's retrieved source uris, in first-seen order — what an eval "retrieval" grader checks against. */
  retrievedSourceUris: string[];
}

function addUsage(total: WorkflowUsage, usage: WorkflowUsage): void {
  total.inputTokens += usage.inputTokens;
  total.outputTokens += usage.outputTokens;
}

function addSourceUris(seen: Set<string>, uris: string[] | undefined): void {
  for (const uri of uris ?? []) seen.add(uri);
}

/**
 * Run a full multi-step plan to completion: execute each step (with its own
 * capped retry — 8.6), compress its output to fit the next step's context
 * budget (8.5), and roll back to a single-step re-attempt of the whole task
 * (8.6) the moment any step fails even after its retry. Rollback is
 * structurally a one-shot: this function returns as soon as it runs, so a
 * plan can never roll back more than once (MVP-Plan §8: "max 1 rollback per
 * plan") — if the rollback attempt itself fails, that's a hard workflow
 * failure (`failed: true`), not another retry loop.
 *
 * Callers should only invoke this for multi-step plans — a single-step plan
 * should take the bypass path instead (MVP-Plan §8), which skips this
 * machinery (and this module) entirely.
 */
export async function runWorkflow(input: RunWorkflowInput): Promise<RunWorkflowResult> {
  const {
    model,
    plan,
    task,
    systemPrompt,
    contextBudgetTokens,
    retrieve,
    groundednessModel,
    onStepEvent,
  } = input;

  const usage: WorkflowUsage = { inputTokens: 0, outputTokens: 0 };
  const sourceUris = new Set<string>();
  const stepOutputs: string[] = [];

  for (const [i, step] of plan.steps.entries()) {
    onStepEvent?.({ type: "step-start", index: step.index, goal: step.goal });

    const run = await runStepWithRetry({
      model,
      step,
      systemPrompt,
      priorStepOutputs: stepOutputs,
      retrieve,
      groundednessModel,
    });
    addUsage(usage, run.usage);
    addSourceUris(sourceUris, run.result.retrievedSourceUris);

    onStepEvent?.({
      type: "step-complete",
      index: step.index,
      passed: run.validation.passed,
      attempts: run.attempts,
    });

    if (!run.validation.passed) {
      onStepEvent?.({ type: "rollback" });
      const rollback = await rollbackToSingleStep({
        model,
        task,
        systemPrompt,
        retrieve,
        groundednessModel,
      });
      addUsage(usage, rollback.usage);
      addSourceUris(sourceUris, rollback.result.retrievedSourceUris);
      return {
        text: rollback.result.output,
        usage,
        failed: !rollback.validation.passed,
        retrievedSourceUris: [...sourceUris],
      };
    }

    const isLastStep = i === plan.steps.length - 1;
    if (isLastStep) {
      stepOutputs.push(run.result.output);
      break;
    }

    const compressed = await compressStepOutput({
      output: run.result.output,
      budgetTokens: contextBudgetTokens,
      model,
    });
    stepOutputs.push(compressed.text);
  }

  return {
    text: stepOutputs[stepOutputs.length - 1] ?? "",
    usage,
    failed: false,
    retrievedSourceUris: [...sourceUris],
  };
}
