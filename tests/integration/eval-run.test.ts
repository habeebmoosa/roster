import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { checkGate, type EvalTier, runEval } from "@/core/eval";
import { resolveModel } from "@/core/providers";
import { prisma } from "@/server/db/prisma";
import { listEvalRuns, saveEvalRun } from "@/server/db/repositories/eval-run.repository";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * Full eval harness offline: run tasks through runAgent() against a mock
 * provider (which returns "Hello world"), score with graders, persist EvalRun
 * rows, and confirm the gate accepts/blocks based on the baseline.
 */
const TEST_AGENT = "__eval_test__";
const API_KEY = "k";
let mock: MockServer;
let tiers: EvalTier[];

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
  tiers = [
    {
      tier: "frontier",
      modelLabel: "mock",
      model: resolveModel({
        provider: "custom",
        model: "mock-model",
        apiKey: API_KEY,
        baseUrl: mock.url,
      }),
    },
  ];
});

afterAll(async () => {
  await prisma.evalRun.deleteMany({ where: { agentId: TEST_AGENT } });
  await mock.close();
  await prisma.$disconnect();
});

const definition = loadAgentDefinitionFile("agents/customer-support/agent.yaml");
const tasks = [
  { id: "pass", input: "hi", graders: [{ type: "includes" as const, values: ["hello"] }] },
  { id: "fail", input: "hi", graders: [{ type: "includes" as const, values: ["zzz-absent"] }] },
];

describe("eval harness (mock provider)", () => {
  it("scores tasks and computes a success rate", async () => {
    const results = await runEval({ definition, tasks, tiers });
    expect(results).toHaveLength(1);
    const [frontier] = results;
    expect(frontier?.total).toBe(2);
    expect(frontier?.passed).toBe(1); // "Hello world" includes "hello", not "zzz-absent"
    expect(frontier?.successRate).toBe(0.5);
  });

  it("persists EvalRun rows", async () => {
    const results = await runEval({ definition, tasks, tiers });
    for (const result of results) await saveEvalRun(TEST_AGENT, result);
    const rows = await listEvalRuns(TEST_AGENT);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]?.successRate).toBe(0.5);
  });

  it("gate accepts at/above baseline and blocks below it", async () => {
    const results = await runEval({ definition, tasks, tiers });
    expect(checkGate(TEST_AGENT, results, { [TEST_AGENT]: { frontier: 0.4 } }).ok).toBe(true);
    expect(checkGate(TEST_AGENT, results, { [TEST_AGENT]: { frontier: 0.6 } }).ok).toBe(false);
  });
});
