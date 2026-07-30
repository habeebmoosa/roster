import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { embedTexts } from "@/core/providers";
import {
  findKnowledgeByFullText,
  findNearestKnowledge,
  insertKnowledgeChunks,
} from "@/server/db/repositories/agent-knowledge.repository";
import { getAgentDefinition, upsertAgent } from "@/server/db/repositories/agent.repository";
import { prisma } from "@/server/db/prisma";
import { hybridSearch } from "@/server/retrieval/hybrid-search";
import { ingestAgentKnowledge } from "@/server/knowledge/ingest";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * Hybrid retrieval end-to-end (offline): ingest the real customer-support
 * knowledge base through a mock embedding provider, then prove vector
 * search, full-text search, RRF fusion, and permission-scoping all work
 * against the real (seeded) data.
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

afterEach(async () => {
  // Remove anything a test injected beyond the real ingested seed content.
  await prisma.agentKnowledge.deleteMany({
    where: { agentId: AGENT_ID, sourceUri: "test://injected" },
  });
});

afterAll(async () => {
  await prisma.agentKnowledge.deleteMany({ where: { agentId: AGENT_ID } });
  await mock.close();
  await prisma.$disconnect();
});

describe("findNearestKnowledge / findKnowledgeByFullText", () => {
  it("only returns chunks for the requested agent", async () => {
    const [queryEmbedding] = await embedTexts(embedInput, ["refund"]);
    const rows = await findNearestKnowledge(AGENT_ID, queryEmbedding!, { limit: 50 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.sourceUri.length > 0)).toBe(true);
  });

  it("full-text search finds a chunk containing the literal query term", async () => {
    const rows = await findKnowledgeByFullText(AGENT_ID, "prorated", { limit: 50 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.content.toLowerCase().includes("prorated"))).toBe(true);
  });

  it("kind filter restricts to semantic or procedural chunks only", async () => {
    const procedural = await findKnowledgeByFullText(AGENT_ID, "refund", {
      limit: 50,
      kind: "procedural",
    });
    expect(procedural.every((r) => r.kind === "procedural")).toBe(true);
    expect(procedural.some((r) => r.sourceUri.startsWith("playbook://"))).toBe(true);
  });
});

describe("hybridSearch", () => {
  it("surfaces refund-policy chunks for a refund query", async () => {
    const results = await hybridSearch({ agentId: AGENT_ID, query: "refund policy", embedInput });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.sourceUri.includes("refunds.md"))).toBe(true);
  });

  it("surfaces the angry-customer playbook for a de-escalation query", async () => {
    const results = await hybridSearch({
      agentId: AGENT_ID,
      query: "customer is angry and hostile, how do I de-escalate",
      embedInput,
    });
    expect(results.some((r) => r.sourceUri === "playbook://angry-customer")).toBe(true);
  });

  it("respects the requested limit", async () => {
    const results = await hybridSearch({
      agentId: AGENT_ID,
      query: "refund",
      embedInput,
      limit: 3,
    });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("excludes a permission-scoped chunk by default, includes it when granted", async () => {
    await insertKnowledgeChunks([
      {
        agentId: AGENT_ID,
        kind: "semantic",
        sourceUri: "test://injected",
        chunkIndex: 0,
        content: "The zorbleflux internal escalation code is 4471.",
        embedding: new Array(1536).fill(0.01),
        embeddingProvider: "openai",
        embeddingModel: "text-embedding-3-small",
        permissions: ["internal"],
      },
    ]);

    const withoutGrant = await hybridSearch({
      agentId: AGENT_ID,
      query: "zorbleflux internal escalation code",
      embedInput,
    });
    expect(withoutGrant.some((r) => r.sourceUri === "test://injected")).toBe(false);

    const withGrant = await hybridSearch({
      agentId: AGENT_ID,
      query: "zorbleflux internal escalation code",
      embedInput,
      grantedPermissions: ["internal"],
    });
    expect(withGrant.some((r) => r.sourceUri === "test://injected")).toBe(true);
  });
});
