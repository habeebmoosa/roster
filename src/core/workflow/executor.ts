import { generateText, type LanguageModel } from "ai";
import type { WorkflowStep } from "./decompose";

export interface StepRetrievalResult {
  text: string;
  sourceUris: string[];
}

/**
 * Injected retrieval dependency — same DI pattern as core/eval's RetrieveFn:
 * the caller resolves real DB/BYOK access (Phase 7's retrieveGroundingContext())
 * and hands in a ready-to-call function, keeping this module DB-free.
 */
export type StepRetrieveFn = (query: string, model: LanguageModel) => Promise<StepRetrievalResult>;

export interface ExecuteStepInput {
  model: LanguageModel;
  step: WorkflowStep;
  /**
   * The persona system prompt to use for every step's call, built once by the
   * caller (core/agent) — this module knows nothing about agent identity or
   * episodic memory, only how to run a step. Deliberately a plain string, not
   * an AgentDefinition, so core/workflow has no dependency on core/agent.
   */
  systemPrompt: string;
  /** Completed prior steps' outputs in this plan, in order — this step's only view into earlier work. */
  priorStepOutputs?: string[];
  /** Omit when the agent has no knowledge base — only called when step.needsRetrieval is true. */
  retrieve?: StepRetrieveFn;
  /** A prior attempt's validation failure reason, fed back into the prompt for a retry (8.6). */
  previousFailureReason?: string;
}

export interface StepUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface StepExecutionResult {
  step: WorkflowStep;
  output: string;
  /** Source uris retrieved for this step, if retrieval ran (undefined if it didn't run). */
  retrievedSourceUris?: string[];
  /** The assembled grounding text retrieval produced, if it ran — what the groundedness validator (8.4) checks output against. */
  retrievedContext?: string;
  /** This step's own model-call usage — the orchestrator (8.7) aggregates these across all steps. */
  usage: StepUsage;
}

function buildStepPrompt(
  step: WorkflowStep,
  priorStepOutputs?: string[],
  retrievedContext?: string,
  previousFailureReason?: string,
): string {
  const lines: string[] = [];

  if (priorStepOutputs && priorStepOutputs.length > 0) {
    lines.push("Progress so far from earlier steps in this plan:");
    for (const [i, output] of priorStepOutputs.entries()) {
      lines.push(`Step ${i + 1} result: ${output}`);
    }
    lines.push("");
  }

  if (retrievedContext) {
    lines.push(
      "Reference material relevant to this step — ground your response in this. If it doesn't cover what's being asked, say so rather than guessing:",
      retrievedContext,
      "",
    );
  }

  lines.push(`Your current task: ${step.goal}`);

  if (previousFailureReason) {
    lines.push(
      "",
      `Your previous attempt at this task was rejected: ${previousFailureReason}`,
      "Address this specifically in your new response.",
    );
  }

  return lines.join("\n");
}

/**
 * Run one workflow step in isolation: assemble the minimal context this step
 * needs — retrieval only when the step's own plan flags it as needed, queried
 * with the step's own goal (not one blanket retrieval for the whole task) —
 * call the model, and return its raw, unvalidated output. Validation (8.4),
 * compression (8.5), and retry/rollback (8.6) are separate stages the
 * orchestrator (8.7) composes around this.
 */
export async function executeStep(input: ExecuteStepInput): Promise<StepExecutionResult> {
  const { model, step, systemPrompt, priorStepOutputs, retrieve, previousFailureReason } = input;

  let retrievedContext: string | undefined;
  let retrievedSourceUris: string[] | undefined;
  if (step.needsRetrieval && retrieve) {
    const retrieval = await retrieve(step.goal, model);
    retrievedContext = retrieval.text || undefined;
    retrievedSourceUris = retrieval.sourceUris;
  }

  const { text, usage } = await generateText({
    model,
    system: systemPrompt,
    prompt: buildStepPrompt(step, priorStepOutputs, retrievedContext, previousFailureReason),
  });

  return {
    step,
    output: text,
    retrievedSourceUris,
    retrievedContext,
    usage: { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 },
  };
}
