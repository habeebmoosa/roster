import { describe, expect, it } from "vitest";
import { computeLatestOverallSuccessRate, type EvalRunSample } from "./overall-success-rate";

function sample(
  agentId: string,
  modelTier: string,
  successRate: number,
  createdAt: string,
): EvalRunSample {
  return { agentId, modelTier, successRate, createdAt: new Date(createdAt) };
}

describe("computeLatestOverallSuccessRate", () => {
  it("returns null when there are no runs", () => {
    expect(computeLatestOverallSuccessRate([])).toBeNull();
  });

  it("averages a single (agent, tier) pair's rate", () => {
    const result = computeLatestOverallSuccessRate([
      sample("customer-support", "frontier", 0.9, "2026-01-01"),
    ]);
    expect(result).toEqual({ rate: 0.9, sampleSize: 1 });
  });

  it("uses only the LATEST run per (agent, tier), not an average of history", () => {
    const result = computeLatestOverallSuccessRate([
      sample("customer-support", "frontier", 0.5, "2026-01-01"), // stale
      sample("customer-support", "frontier", 0.9, "2026-01-02"), // latest
    ]);
    expect(result).toEqual({ rate: 0.9, sampleSize: 1 });
  });

  it("averages across distinct (agent, tier) combinations", () => {
    const result = computeLatestOverallSuccessRate([
      sample("customer-support", "frontier", 1.0, "2026-01-01"),
      sample("customer-support", "cheap", 0.5, "2026-01-01"),
    ]);
    expect(result).toEqual({ rate: 0.75, sampleSize: 2 });
  });

  it("treats the same tier on different agents as distinct samples", () => {
    const result = computeLatestOverallSuccessRate([
      sample("customer-support", "frontier", 1.0, "2026-01-01"),
      sample("content-writer", "frontier", 0.0, "2026-01-01"),
    ]);
    expect(result).toEqual({ rate: 0.5, sampleSize: 2 });
  });
});
