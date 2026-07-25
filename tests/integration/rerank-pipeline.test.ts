import { MockLanguageModelV4 } from "ai/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { rerankCandidates } from "@/core/retrieval";
import { getAgentDefinition, upsertAgent } from "@/server/db/repositories/agent.repository";
import { prisma } from "@/server/db/prisma";
import { ingestAgentKnowledge } from "@/server/knowledge/ingest";
import { hybridSearch } from "@/server/retrieval/hybrid-search";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * Proves the seam between 7.3 (hybridSearch) and 7.4 (rerankCandidates):
 * real hybrid-search output feeds directly into the re-ranker with no
 * transformation, against the real seeded customer-support KB.
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

const MOCK_FINISH_REASON = { unified: "stop" as const, raw: undefined };
const MOCK_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

describe("hybridSearch -> rerankCandidates", () => {
  it("narrows real hybrid-search candidates down via the re-ranker", async () => {
    const candidates = await hybridSearch({
      agentId: AGENT_ID,
      query: "refund policy",
      embedInput,
    });
    expect(candidates.length).toBeGreaterThan(1);

    // Simulate a reranker model that picks exactly one real candidate — proves
    // rerankCandidates can consume hybridSearch's output directly (no adapter
    // needed) and that its id-matching logic works against real chunk ids.
    const chosenId = candidates[0]!.id;
    const model = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: "text", text: JSON.stringify({ rankedIds: [chosenId] }) }],
        finishReason: MOCK_FINISH_REASON,
        usage: MOCK_USAGE,
        warnings: [],
      },
    });

    const reranked = await rerankCandidates({ query: "refund policy", candidates, model });
    expect(reranked).toHaveLength(1);
    expect(reranked[0]!.id).toBe(chosenId);
    expect(reranked[0]!.content).toBe(candidates[0]!.content);
  });
});
