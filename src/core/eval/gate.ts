import type { ModelTier } from "@/config/model-tiers";
import type { Baseline, EvalTierResult } from "./types";

export interface GateRegression {
  tier: ModelTier;
  baseline: number;
  actual: number;
}

export interface GateResult {
  ok: boolean;
  regressions: GateRegression[];
}

/**
 * The eval gate: a run is accepted only if every tier's success rate holds at
 * or above its baseline (within epsilon). Tiers without a baseline are ignored.
 */
export function checkGate(
  agentId: string,
  results: EvalTierResult[],
  baseline: Baseline,
  epsilon = 0.001,
): GateResult {
  const thresholds = baseline[agentId] ?? {};
  const regressions: GateRegression[] = [];

  for (const result of results) {
    const min = thresholds[result.tier];
    if (min === undefined) continue;
    if (result.successRate < min - epsilon) {
      regressions.push({ tier: result.tier, baseline: min, actual: result.successRate });
    }
  }

  return { ok: regressions.length === 0, regressions };
}
