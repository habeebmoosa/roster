import type { LanguageModel, ToolSet } from "ai";
import {
  executeStep,
  type StepExecutionResult,
  type StepRetrieveFn,
  type StepUsage,
} from "./executor";
import { validateStep, type ValidationResult } from "./validate";
import type { WorkflowStep } from "./decompose";

/** Same step, retried at most this many times (MVP-Plan §8: "max 1 retry per step"). */
const MAX_RETRIES_PER_STEP = 1;

export interface RunStepInput {
  model: LanguageModel;
  step: WorkflowStep;
  /** The persona system prompt to use for every attempt, built once by the caller (core/agent). */
  systemPrompt: string;
  /** Completed prior steps' outputs in this plan, in order. */
  priorStepOutputs?: string[];
  retrieve?: StepRetrieveFn;
  /** Model that judges groundedness — independent of `model`'s own output, never self-critique. Omit to skip that check. */
  groundednessModel?: LanguageModel;
  /** Built-in + MCP tools available to this step (10.7). */
  tools?: ToolSet;
}

export interface StepRunResult {
  result: StepExecutionResult;
  validation: ValidationResult;
  /** Execution attempts this step took (1 = passed first try, 2 = passed on its one retry, or exhausted). */
  attempts: number;
  /** Usage summed across every attempt, including any that failed validation — the true cost of this step. */
  usage: StepUsage;
}

/**
 * Run one step to completion: execute, validate, and — if validation fails —
 * retry the *same* step exactly once, with the failure reason fed back into
 * the prompt (never a same-model self-critique loop; this is the model
 * correcting itself against concrete external feedback, not grading its own
 * work). A step that still fails after its one retry returns a failed
 * StepRunResult rather than looping again — the caller ({@link
 * rollbackToSingleStep} or the Phase 8.7 orchestrator) decides what happens
 * next.
 */
export async function runStepWithRetry(input: RunStepInput): Promise<StepRunResult> {
  const { model, step, systemPrompt, priorStepOutputs, retrieve, groundednessModel, tools } = input;
  const maxAttempts = MAX_RETRIES_PER_STEP + 1;

  let previousFailureReason: string | undefined;
  let result: StepExecutionResult;
  let validation: ValidationResult;
  let attempts = 0;
  const usage: StepUsage = { inputTokens: 0, outputTokens: 0 };

  do {
    attempts += 1;
    result = await executeStep({
      model,
      step,
      systemPrompt,
      priorStepOutputs,
      retrieve,
      previousFailureReason,
      tools,
    });
    usage.inputTokens += result.usage.inputTokens;
    usage.outputTokens += result.usage.outputTokens;
    validation = await validateStep({ result, groundednessModel });
    previousFailureReason = validation.reason;
  } while (!validation.passed && attempts < maxAttempts);

  return { result, validation, attempts, usage };
}

export interface RollbackInput {
  model: LanguageModel;
  /** The original, whole task — rollback abandons the multi-step plan and re-attempts this directly. */
  task: string;
  /** The persona system prompt to use, built once by the caller (core/agent). */
  systemPrompt: string;
  retrieve?: StepRetrieveFn;
  groundednessModel?: LanguageModel;
  /** Built-in + MCP tools available to the rollback attempt (10.7). */
  tools?: ToolSet;
}

/**
 * The plan-level fallback when a step fails even after its retry: give up on
 * decomposition and re-attempt the whole original task as a single step
 * (the same shape as the single-step bypass — MVP-Plan §8's simplest,
 * safest path). Reuses {@link runStepWithRetry}, so this one rollback
 * attempt still gets its own single retry if it fails validation.
 *
 * This function performs exactly one rollback attempt — the "max 1 rollback
 * per plan" cap is enforced by the caller (the Phase 8.7 orchestrator) simply
 * never calling this more than once per plan, not by state kept here.
 */
export function rollbackToSingleStep(input: RollbackInput): Promise<StepRunResult> {
  const { model, task, systemPrompt, retrieve, groundednessModel, tools } = input;
  const wholeTaskStep: WorkflowStep = { index: 1, goal: task, needsRetrieval: true };

  return runStepWithRetry({
    model,
    step: wholeTaskStep,
    systemPrompt,
    retrieve,
    tools,
    groundednessModel,
  });
}
