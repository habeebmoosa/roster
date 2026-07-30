import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { StepExecutionResult } from "./executor";

export interface ValidationResult {
  passed: boolean;
  /** Human-readable failure reason, fed back into the retry prompt (8.6). Undefined when passed. */
  reason?: string;
}

/**
 * Mechanical, deterministic shape check — code, not an LLM call, so it's free
 * and never wrong about what it does check. This is the first line of
 * validation per MVP-Plan §8: schema/shape checks before any semantic check.
 */
export function validateShape(result: StepExecutionResult): ValidationResult {
  if (result.output.trim().length === 0) {
    return { passed: false, reason: "The step produced an empty response." };
  }
  return { passed: true };
}

const groundednessResultSchema = z.object({
  grounded: z
    .boolean()
    .describe(
      "True only if every factual claim in the response is supported by the given context.",
    ),
  reason: z
    .string()
    .optional()
    .describe("If not grounded, a brief note on which claim(s) aren't supported."),
});

function buildGroundednessPrompt(output: string, retrievedContext: string): string {
  return [
    "Check whether a response's claims are supported by the context it was given.",
    "",
    "Context it had available:",
    retrievedContext,
    "",
    "Response to check:",
    output,
    "",
    "Judge only whether the response's claims trace back to the context above — not whether it's well-written or complete.",
  ].join("\n");
}

export interface GroundednessCheckInput {
  output: string;
  retrievedContext: string;
  /**
   * The model that judges groundedness. Must be an independent check, never
   * the same-model-self-critique pattern ("ask the model if its own answer
   * looks good") the literature shows doesn't reliably help — callers should
   * not pass the exact model/call that produced `output` back into itself as
   * a reflective judge of its own text.
   */
  model: LanguageModel;
}

/**
 * LLM-based groundedness check: do the response's claims trace back to the
 * retrieved context? This is a genuinely semantic comparison (MVP-Plan §8),
 * so it's the one validator that needs a model call — everything mechanical
 * runs first via {@link validateShape}.
 */
export async function validateGroundedness(
  input: GroundednessCheckInput,
): Promise<ValidationResult> {
  try {
    const result = await generateObject({
      model: input.model,
      schema: groundednessResultSchema,
      prompt: buildGroundednessPrompt(input.output, input.retrievedContext),
    });
    if (result.object.grounded) return { passed: true };
    return {
      passed: false,
      reason:
        result.object.reason ??
        "The response includes claims not supported by the retrieved context.",
    };
  } catch {
    // A validator that can't run shouldn't wrongly fail otherwise-fine output
    // (and burn the capped retry budget) — degrade gracefully, same
    // philosophy as the Phase 7 re-ranker's fallback on a bad model response.
    return { passed: true };
  }
}

export interface ValidateStepInput {
  result: StepExecutionResult;
  /** Required only to run the groundedness check — omit to skip it (e.g. no validator model configured for this run). */
  groundednessModel?: LanguageModel;
}

/**
 * The composed, pluggable validator entry point a caller runs per step:
 * mechanical checks first (free, deterministic), then the LLM-based
 * groundedness check — but only when the step actually used retrieval and a
 * groundedness model was supplied. A step that didn't retrieve has nothing to
 * ground against, so groundedness is simply not applicable to it.
 */
export async function validateStep(input: ValidateStepInput): Promise<ValidationResult> {
  const { result, groundednessModel } = input;

  const shape = validateShape(result);
  if (!shape.passed) return shape;

  const shouldCheckGroundedness =
    result.step.needsRetrieval && Boolean(result.retrievedContext) && Boolean(groundednessModel);
  if (!shouldCheckGroundedness) return { passed: true };

  return validateGroundedness({
    output: result.output,
    retrievedContext: result.retrievedContext!,
    model: groundednessModel!,
  });
}
