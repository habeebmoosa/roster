import { MockLanguageModelV4 } from "ai/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { runEval, type RetrieveFn } from "@/core/eval";
import { loadEvalSet } from "@/core/eval/loader";
import { getAgentDefinition, upsertAgent } from "@/server/db/repositories/agent.repository";
import { prisma } from "@/server/db/prisma";
import { ingestAgentKnowledge } from "@/server/knowledge/ingest";
import { retrieveGroundingContext } from "@/server/retrieval/grounding";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * Proves the Phase 8 multi-step workflow's per-step retrieval genuinely
 * aggregates across steps against the real Phase 7 pipeline (real seeded KB,
 * real hybrid search, real embeddings via the mock server) — not just in
 * isolation with mocked step results (already covered in
 * core/eval/runner.test.ts and core/workflow/orchestrate.test.ts).
 *
 * The chat model returns a real structured plan for the decompose call so
 * the workflow genuinely takes the multi-step path, and falls back to a
 * fixed plain-text answer for every other call — the re-ranker degrades
 * gracefully on that (same as eval-retrieval-pipeline.test.ts), and each
 * step's own answer doesn't need to be individually scripted since this test
 * is proving retrieval aggregation + grading wiring, not model judgment
 * (which the mocked-step unit tests already cover).
 */
const API_KEY = "test-key-123";
const AGENT_ID = "customer-support";
const AGENT_DIR = `agents/${AGENT_ID}`;
let mock: MockServer;
let embedInput: { provider: string; apiKey: string; baseUrl: string };

const MOCK_FINISH_REASON = { unified: "stop" as const, raw: undefined };
const MOCK_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function multiStepDualRefundModel(): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: async (options) => {
      const promptText = JSON.stringify(options.prompt);
      const isDecomposeCall = promptText.includes("planning how to complete a task");
      const text = isDecomposeCall
        ? JSON.stringify({
            steps: [
              {
                goal: "Explain the resolution for a duplicate charge on an order",
                needsRetrieval: true,
              },
              {
                goal: "Determine refund eligibility and fee for a purchase made 45 days ago",
                needsRetrieval: true,
              },
            ],
          })
        : "Duplicate charges are always fully refundable. A purchase from 45 days ago qualifies " +
          "for a prorated refund minus a $15 fee.";
      return {
        content: [{ type: "text", text }],
        finishReason: MOCK_FINISH_REASON,
        usage: MOCK_USAGE,
        warnings: [],
      };
    },
  });
}

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
  embedInput = { provider: "openai", apiKey: API_KEY, baseUrl: mock.url };
  await upsertAgent(loadAgentDefinitionFile(`${AGENT_DIR}/agent.yaml`));
  const definition = (await getAgentDefinition(AGENT_ID))!;
  await ingestAgentKnowledge({ definition, agentDir: AGENT_DIR, embedInput });
});

afterAll(async () => {
  await prisma.agentKnowledge.deleteMany({ where: { agentId: AGENT_ID } });
  await mock.close();
  await prisma.$disconnect();
});

describe("eval harness multi-step workflow (real KB, real evals/customer-support-multistep.json fixture)", () => {
  it("a multi-step task's retrieval grader passes using per-step retrieval aggregated across the whole workflow", async () => {
    const definition = (await getAgentDefinition(AGENT_ID))!;
    const set = loadEvalSet(`evals/${AGENT_ID}-multistep.json`);
    const task = set.tasks.find((t) => t.id === "dual-refund-scenarios")!;

    const retrieve: RetrieveFn = async (query, model) => {
      const assembled = await retrieveGroundingContext({
        agentId: AGENT_ID,
        query,
        embedInput,
        model,
        budgetTokens: definition.context_budget_tokens,
      });
      return { text: assembled.text, sourceUris: assembled.usedSourceUris };
    };

    const results = await runEval({
      definition,
      tasks: [task],
      tiers: [{ tier: "cheap", modelLabel: "mock", model: multiStepDualRefundModel() }],
      retrieve,
    });

    const caseResult = results[0]!.cases[0]!;
    expect(caseResult.retrievedSourceUris).toContain("kb://support-docs/refunds.md");
    expect(caseResult.passed).toBe(true);
  });
});
