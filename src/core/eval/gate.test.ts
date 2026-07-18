import { describe, expect, it } from "vitest";
import type { ModelTier } from "@/config/model-tiers";
import { checkGate } from "./gate";
import type { Baseline, EvalTierResult } from "./types";

function tier(t: ModelTier, successRate: number): EvalTierResult {
  return {
    tier: t,
    modelLabel: "m",
    total: 10,
    passed: Math.round(successRate * 10),
    successRate,
    avgTokens: 0,
    avgLatencyMs: 0,
    cases: [],
  };
}

const baseline: Baseline = { "customer-support": { frontier: 0.8, mid: 0.7, cheap: 0.6 } };

describe("checkGate", () => {
  it("passes when every tier holds at or above baseline", () => {
    const result = checkGate(
      "customer-support",
      [tier("frontier", 0.8), tier("mid", 0.75), tier("cheap", 0.9)],
      baseline,
    );
    expect(result.ok).toBe(true);
    expect(result.regressions).toHaveLength(0);
  });

  it("fails when a tier regresses below baseline (the gate bites)", () => {
    const result = checkGate("customer-support", [tier("cheap", 0.4)], baseline);
    expect(result.ok).toBe(false);
    expect(result.regressions[0]).toMatchObject({ tier: "cheap", baseline: 0.6, actual: 0.4 });
  });

  it("ignores tiers that have no baseline", () => {
    const result = checkGate("unknown-agent", [tier("frontier", 0)], baseline);
    expect(result.ok).toBe(true);
  });

  it("tolerates a dip within epsilon", () => {
    const result = checkGate("customer-support", [tier("frontier", 0.8 - 0.0005)], baseline, 0.001);
    expect(result.ok).toBe(true);
  });
});
