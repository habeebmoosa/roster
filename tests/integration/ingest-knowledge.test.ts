import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { TARGET_EMBEDDING_DIMENSIONS } from "@/core/providers";
import { getAgentDefinition, upsertAgent } from "@/server/db/repositories/agent.repository";
import { countKnowledgeForAgent } from "@/server/db/repositories/agent-knowledge.repository";
import { prisma } from "@/server/db/prisma";
import { ingestAgentKnowledge } from "@/server/knowledge/ingest";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * ingestAgentKnowledge() end-to-end (offline): reads the real
 * agents/customer-support/{knowledge,playbooks} seed content, chunks it,
 * embeds it through a mock OpenAI-compatible provider, and stores it —
 * proving the full write path this sub-phase built.
 */
const API_KEY = "test-key-123";
const AGENT_DIR = "agents/customer-support";
let mock: MockServer;

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
  await upsertAgent(loadAgentDefinitionFile(`${AGENT_DIR}/agent.yaml`));
});

afterEach(async () => {
  await prisma.agentKnowledge.deleteMany({ where: { agentId: "customer-support" } });
});

afterAll(async () => {
  await mock.close();
  await prisma.$disconnect();
});

describe("ingestAgentKnowledge", () => {
  it("chunks, embeds, and stores every knowledge doc and playbook", async () => {
    const definition = (await getAgentDefinition("customer-support"))!;
    const results = await ingestAgentKnowledge({
      definition,
      agentDir: AGENT_DIR,
      embedInput: { provider: "openai", apiKey: API_KEY, baseUrl: mock.url },
    });

    // 3 knowledge docs + 2 playbooks, per the definition's memory.semantic/procedural.
    expect(results).toHaveLength(5);
    for (const result of results) {
      expect(result.chunksIngested).toBeGreaterThan(0);
    }

    const sourceUris = results.map((r) => r.sourceUri).sort();
    expect(sourceUris).toEqual(
      [
        "kb://support-docs/account-issues.md",
        "kb://support-docs/refunds.md",
        "kb://support-docs/shipping.md",
        "playbook://angry-customer",
        "playbook://refund-flow",
      ].sort(),
    );

    const totalChunks = results.reduce((sum, r) => sum + r.chunksIngested, 0);
    expect(await countKnowledgeForAgent("customer-support")).toBe(totalChunks);

    const rows = await prisma.$queryRaw<
      Array<{ kind: string; embeddingProvider: string; embeddingModel: string; dims: number }>
    >`
      SELECT kind, "embeddingProvider", "embeddingModel", vector_dims(embedding) AS dims
      FROM agent_knowledge
      WHERE "agentId" = 'customer-support'
      LIMIT 1
    `;
    expect(rows[0]?.embeddingProvider).toBe("openai");
    expect(rows[0]?.embeddingModel).toBe("text-embedding-3-small");
    expect(rows[0]?.dims).toBe(TARGET_EMBEDDING_DIMENSIONS);
  });

  it("is idempotent — re-ingesting the same sources replaces rather than duplicates", async () => {
    const definition = (await getAgentDefinition("customer-support"))!;
    const embedInput = { provider: "openai", apiKey: API_KEY, baseUrl: mock.url };

    const first = await ingestAgentKnowledge({ definition, agentDir: AGENT_DIR, embedInput });
    const firstCount = await countKnowledgeForAgent("customer-support");

    const second = await ingestAgentKnowledge({ definition, agentDir: AGENT_DIR, embedInput });
    const secondCount = await countKnowledgeForAgent("customer-support");

    expect(second.reduce((s, r) => s + r.chunksIngested, 0)).toBe(
      first.reduce((s, r) => s + r.chunksIngested, 0),
    );
    expect(secondCount).toBe(firstCount);
  });
});
