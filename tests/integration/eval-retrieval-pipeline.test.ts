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
 * The real eval CLI's retrieval glue (scripts/eval.ts's buildRetrieveFn),
 * reproduced here since the script itself runs main() at import time and
 * isn't safely importable as a module — proves the *actual* non-mocked
 * retrieveGroundingContext() -> RetrieveFn mapping end to end against the
 * real seeded customer-support KB, using the real
 * evals/customer-support-grounded.json fixture (not synthetic test data).
 */
const API_KEY = "test-key-123";
const AGENT_ID = "customer-support";
const AGENT_DIR = `agents/${AGENT_ID}`;
let mock: MockServer;
let embedInput: { provider: string; apiKey: string; baseUrl: string };

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

describe("eval harness retrieval (real KB, real evals/customer-support-grounded.json fixture)", () => {
  it("a grounded eval task's retrieval grader passes using real hybrid search + assembly", async () => {
    const definition = (await getAgentDefinition(AGENT_ID))!;
    const set = loadEvalSet(`evals/${AGENT_ID}-grounded.json`);
    const task = set.tasks.find((t) => t.id === "refund-fee-grounded")!;

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

    // Mock chat model — content doesn't matter for this test since we're
    // isolating the retrieval grader, so only assert its half of the result.
    const model = new MockLanguageModelV4({
      doStream: {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "text-start", id: "1" });
            controller.enqueue({ type: "text-delta", id: "1", delta: "The fee is $15." });
            controller.enqueue({ type: "text-end", id: "1" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              usage: {
                inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
                outputTokens: { total: 1, text: 1, reasoning: undefined },
              },
            });
            controller.close();
          },
        }),
      },
    });

    const results = await runEval({
      definition,
      tasks: [task],
      tiers: [{ tier: "cheap", modelLabel: "mock", model }],
      retrieve,
    });

    const caseResult = results[0]!.cases[0]!;
    expect(caseResult.retrievedSourceUris).toContain("kb://support-docs/refunds.md");
    const retrievalFailure = caseResult.failures.find((f) => f.includes("recall"));
    expect(retrievalFailure).toBeUndefined();
  });
});
