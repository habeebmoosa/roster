import { generateText, type LanguageModel } from "ai";
import { countTokens, truncateToTokenBudget } from "@/lib/tokens";

/**
 * How far over budget an output has to be before mechanical truncation is
 * considered too lossy and an LLM summarization call is warranted instead.
 * Below this multiplier, truncation alone (free, deterministic) is used.
 */
const SUMMARIZE_THRESHOLD_MULTIPLIER = 3;

export type CompressionMethod = "none" | "truncate" | "summarize";

export interface CompressedStepOutput {
  text: string;
  /** False when the output already fit the budget and nothing was done. */
  compressed: boolean;
  method: CompressionMethod;
}

function buildSummarizePrompt(output: string, budgetTokens: number): string {
  return [
    `Summarize the following so it fits in roughly ${budgetTokens} tokens.`,
    "Preserve every concrete fact, number, name, and decision — drop only redundant phrasing and filler.",
    "This summary will be used as working context for the next step of a multi-step task, not shown to a user directly.",
    "",
    output,
  ].join("\n");
}

async function summarize(
  output: string,
  budgetTokens: number,
  model: LanguageModel,
): Promise<string> {
  const { text } = await generateText({
    model,
    prompt: buildSummarizePrompt(output, budgetTokens),
  });
  return text;
}

export interface CompressStepOutputInput {
  output: string;
  /** The next step's context budget this output needs to fit into. */
  budgetTokens: number;
  /** Only used when the output genuinely exceeds the budget — omit to always use mechanical truncation. */
  model?: LanguageModel;
}

/**
 * Compress a step's output to fit the next step's context budget.
 * Mechanical truncation is the default and the always-succeeds fallback
 * (MVP-Plan §8: "mechanical compression first"). An LLM summarization call
 * only runs when truncation would be too lossy — i.e. the output genuinely
 * exceeds the budget, not just slightly over it — and even then the result
 * is still mechanically capped afterward, since a summary isn't guaranteed to
 * land under budget on its own.
 */
export async function compressStepOutput(
  input: CompressStepOutputInput,
): Promise<CompressedStepOutput> {
  const { output, budgetTokens, model } = input;
  const tokens = countTokens(output);

  if (tokens <= budgetTokens) {
    return { text: output, compressed: false, method: "none" };
  }

  const genuinelyExceedsBudget = tokens > budgetTokens * SUMMARIZE_THRESHOLD_MULTIPLIER;

  if (genuinelyExceedsBudget && model) {
    try {
      const summarized = await summarize(output, budgetTokens, model);
      return {
        text: truncateToTokenBudget(summarized, budgetTokens),
        compressed: true,
        method: "summarize",
      };
    } catch {
      // Degrade gracefully — same philosophy as validate.ts/rerank.ts: an LLM
      // call failing shouldn't block the workflow. Fall through to mechanical
      // truncation, which always succeeds.
    }
  }

  return {
    text: truncateToTokenBudget(output, budgetTokens),
    compressed: true,
    method: "truncate",
  };
}
