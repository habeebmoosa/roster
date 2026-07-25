import type { LanguageModel } from "ai";
import type { AgentDefinition, EpisodicMemoryEntry } from "@/core/agent";
import { executeStep, type StepExecutionResult, type StepRetrieveFn } from "./executor";
import { validateStep, type ValidationResult } from "./validate";
import type { WorkflowStep } from "./decompose";

/** Same step, retried at most this many times (MVP-Plan §8: "max 1 retry per step"). */
const MAX_RETRIES_PER_STEP = 1;

export interface RunStepInput {
  definition: AgentDefinition;
  model: LanguageModel;
  step: WorkflowStep;
  /** Completed prior steps' outputs in this plan, in order. */
  priorStepOutputs?: string[];
  episodicMemory?: EpisodicMemoryEntry[];
  retrieve?: StepRetrieveFn;
  /** Model that judges groundedness — independent of `model`'s own output, never self-critique. Omit to skip that check. */
  groundednessModel?: LanguageModel;
}

export interface StepRunResult {
  result: StepExecutionResult;
  validation: ValidationResult;
  /** Execution attempts this step took (1 = passed first try, 2 = passed on its one retry, or exhausted). */
  attempts: number;
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
  const { definition, model, step, priorStepOutputs, episodicMemory, retrieve, groundednessModel } =
    input;
  const maxAttempts = MAX_RETRIES_PER_STEP + 1;

  let previousFailureReason: string | undefined;
  let result: StepExecutionResult;
  let validation: ValidationResult;
  let attempts = 0;

  do {
    attempts += 1;
    result = await executeStep({
      definition,
      model,
      step,
      priorStepOutputs,
      episodicMemory,
      retrieve,
      previousFailureReason,
    });
    validation = await validateStep({ result, groundednessModel });
    previousFailureReason = validation.reason;
  } while (!validation.passed && attempts < maxAttempts);

  return { result, validation, attempts };
}

export interface RollbackInput {
  definition: AgentDefinition;
  model: LanguageModel;
  /** The original, whole task — rollback abandons the multi-step plan and re-attempts this directly. */
  task: string;
  episodicMemory?: EpisodicMemoryEntry[];
  retrieve?: StepRetrieveFn;
  groundednessModel?: LanguageModel;
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
  const { definition, model, task, episodicMemory, retrieve, groundednessModel } = input;
  const wholeTaskStep: WorkflowStep = { index: 1, goal: task, needsRetrieval: true };

  return runStepWithRetry({
    definition,
    model,
    step: wholeTaskStep,
    episodicMemory,
    retrieve,
    groundednessModel,
  });
}
