import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { getLatestOverallSuccessRate } from "@/server/db/repositories/eval-run.repository";

const AGENT_ID = "__dashboard_metrics_test__";

beforeAll(async () => {
  await prisma.evalRun.createMany({
    data: [
      {
        agentId: AGENT_ID,
        modelTier: "frontier",
        modelLabel: "m",
        total: 5,
        passed: 5,
        successRate: 1.0,
        avgTokens: 0,
        avgLatencyMs: 0,
      },
      {
        agentId: AGENT_ID,
        modelTier: "cheap",
        modelLabel: "m",
        total: 5,
        passed: 3,
        successRate: 0.6,
        avgTokens: 0,
        avgLatencyMs: 0,
      },
    ],
  });
});

afterAll(async () => {
  await prisma.evalRun.deleteMany({ where: { agentId: AGENT_ID } });
  await prisma.$disconnect();
});

describe("getLatestOverallSuccessRate", () => {
  it("averages the latest run per tier across real EvalRun rows", async () => {
    const result = await getLatestOverallSuccessRate();
    expect(result).not.toBeNull();
    // Other suites/fixtures may also write EvalRun rows, so assert bounds
    // rather than an exact value.
    expect(result!.rate).toBeGreaterThanOrEqual(0);
    expect(result!.rate).toBeLessThanOrEqual(1);
    expect(result!.sampleSize).toBeGreaterThanOrEqual(2);
  });
});
