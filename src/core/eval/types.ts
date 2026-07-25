import { z } from "zod";
import type { ModelTier } from "@/config/model-tiers";

/**
 * A deterministic grader — no LLM judge (keeps evals cheap, fast, and
 * reproducible). Richer grading (rubrics, LLM-as-judge) can be added later.
 */
export const graderSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("includes"), values: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("excludes"), values: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("regex"), pattern: z.string().min(1) }),
  z.object({
    type: z.literal("retrieval"),
    /** Source uris (e.g. "kb://support-docs/refunds.md") that should have been retrieved. */
    expectedSourceUris: z.array(z.string()).min(1),
    /** Fraction of expectedSourceUris that must have been retrieved. Default: all of them. */
    minRecall: z.number().min(0).max(1).default(1),
    /** Fraction of retrieved sources that must be in expectedSourceUris. Default: unenforced. */
    minPrecision: z.number().min(0).max(1).default(0),
  }),
]);
export type Grader = z.infer<typeof graderSchema>;

export const evalTaskSchema = z.object({
  id: z.string().min(1),
  input: z.string().min(1),
  graders: z.array(graderSchema).min(1),
});
export type EvalTask = z.infer<typeof evalTaskSchema>;

export const evalSetSchema = z.object({
  agentId: z.string().min(1),
  tasks: z.array(evalTaskSchema).min(1),
});
export type EvalSet = z.infer<typeof evalSetSchema>;

export function parseEvalSet(raw: unknown): EvalSet {
  const result = evalSetSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid eval set: ${issues}`);
  }
  return result.data;
}

export interface EvalCaseResult {
  taskId: string;
  passed: boolean;
  failures: string[];
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  /** Undefined when the tier has no per-token pricing configured. */
  costUsd?: number;
  latencyMs: number;
  output: string;
  /** Source uris actually retrieved for this case, if the run performed retrieval. */
  retrievedSourceUris?: string[];
}

export interface EvalTierResult {
  tier: ModelTier;
  modelLabel: string;
  total: number;
  passed: number;
  successRate: number;
  avgTokens: number;
  avgLatencyMs: number;
  /** 0 when the tier has no per-token pricing configured. */
  avgCostUsd: number;
  cases: EvalCaseResult[];
}

/** Per-agent, per-tier minimum success rate the eval gate enforces. */
export type Baseline = Record<string, Partial<Record<ModelTier, number>>>;
