import {
  computeLatestOverallSuccessRate,
  type EvalTierResult,
  type OverallSuccessRate,
} from "@/core/eval";
import { prisma } from "@/server/db/prisma";

export interface EvalRunRow {
  id: string;
  agentId: string;
  modelTier: string;
  modelLabel: string;
  total: number;
  passed: number;
  successRate: number;
  avgTokens: number;
  avgLatencyMs: number;
  createdAt: Date;
}

export async function saveEvalRun(agentId: string, result: EvalTierResult): Promise<void> {
  await prisma.evalRun.create({
    data: {
      agentId,
      modelTier: result.tier,
      modelLabel: result.modelLabel,
      total: result.total,
      passed: result.passed,
      successRate: result.successRate,
      avgTokens: result.avgTokens,
      avgLatencyMs: result.avgLatencyMs,
    },
  });
}

export function listEvalRuns(agentId?: string, limit = 30): Promise<EvalRunRow[]> {
  return prisma.evalRun.findMany({
    where: agentId ? { agentId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Dashboard "Eval success rate" tile — null when no evals have run yet. */
export async function getLatestOverallSuccessRate(): Promise<OverallSuccessRate | null> {
  const rows = await prisma.evalRun.findMany({
    select: { agentId: true, modelTier: true, successRate: true, createdAt: true },
  });
  return computeLatestOverallSuccessRate(rows);
}
