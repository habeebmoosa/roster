import { MockLanguageModelV4 } from "ai/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { assembleContext, rerankCandidates } from "@/core/retrieval";
import { getAgentDefinition, upsertAgent } from "@/server/db/repositories/agent.repository";
import { prisma } from "@/server/db/prisma";
import { ingestAgentKnowledge } from "@/server/knowledge/ingest";
import { hybridSearch } from "@/server/retrieval/hybrid-search";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * The full retrieval pipeline this whole phase built, chained end to end
 * against the real seeded customer-support KB: hybrid search -> re-rank ->
 * hard-capped context assembly.
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

function rerankerThatPicks(ids: string[]): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: JSON.stringify({ rankedIds: ids }) }],
      finishReason: MOCK_FINISH_REASON,
      usage: MOCK_USAGE,
      warnings: [],
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

describe("hybridSearch -> rerankCandidates -> assembleContext", () => {
  it("produces a labeled, budget-respecting context block from real retrieval", async () => {
    const definition = (await getAgentDefinition(AGENT_ID))!;
    const candidates = await hybridSearch({
      agentId: AGENT_ID,
      query: "refund policy",
      embedInput,
    });

    const topIds = candidates.slice(0, 3).map((c) => c.id);
    const reranked = await rerankCandidates({
      query: "refund policy",
      candidates,
      model: rerankerThatPicks(topIds),
    });

    const assembled = assembleContext(reranked, definition.context_budget_tokens);

    expect(assembled.usedChunkIds).toEqual(topIds);
    expect(assembled.totalTokens).toBeLessThanOrEqual(definition.context_budget_tokens);
    expect(assembled.truncated).toBe(false); // real content is tiny next to the 8000 default budget
    expect(assembled.text).toContain("[Knowledge: kb://support-docs/refunds.md]");
  });

  it("actually enforces the hard cap once the budget is smaller than the real content", async () => {
    const candidates = await hybridSearch({
      agentId: AGENT_ID,
      query: "refund policy",
      embedInput,
    });
    const topIds = candidates.slice(0, 3).map((c) => c.id);
    const reranked = await rerankCandidates({
      query: "refund policy",
      candidates,
      model: rerankerThatPicks(topIds),
    });

    const tinyBudget = 30;
    const assembled = assembleContext(reranked, tinyBudget);

    expect(assembled.totalTokens).toBeLessThanOrEqual(tinyBudget);
    expect(assembled.truncated).toBe(true);
    expect(assembled.usedChunkIds.length).toBeLessThan(reranked.length);
  });
});
