export interface EvalRunSample {
  agentId: string;
  modelTier: string;
  successRate: number;
  createdAt: Date;
}

export interface OverallSuccessRate {
  /** Average of the most recent run per (agent, tier) — a snapshot of current eval health. */
  rate: number;
  /** How many distinct (agent, tier) combinations contributed. */
  sampleSize: number;
}

/**
 * Pure aggregation: averages the LATEST run per (agentId, modelTier), so a
 * long history of repeated runs on one tier doesn't drown out the others.
 * Returns null when there are no runs yet (dashboard shows "No data yet").
 */
export function computeLatestOverallSuccessRate(rows: EvalRunSample[]): OverallSuccessRate | null {
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const seen = new Set<string>();
  const latestRates: number[] = [];

  for (const row of sorted) {
    const key = `${row.agentId}:${row.modelTier}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latestRates.push(row.successRate);
  }

  return {
    rate: latestRates.reduce((sum, r) => sum + r, 0) / latestRates.length,
    sampleSize: latestRates.length,
  };
}
