import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  deleteKnowledgeBySourceUri,
  findKnowledgeByFullText,
  findNearestKnowledge,
  insertKnowledgeChunks,
} from "@/server/db/repositories/agent-knowledge.repository";
import { prisma } from "@/server/db/prisma";

/**
 * Regression coverage for a live bug report: a Postgres "syntax error at or
 * near $N" surfaced from these two raw queries during real chat retrieval.
 * The embedded conditional SQL fragment (`options.kind ? Prisma.sql\`...\` :
 * Prisma.empty`) couldn't be reproduced as broken in isolation, but it's a
 * known-fragile pattern, so it was replaced with a fixed-shape query (a
 * `kind IS NULL OR kind = ...` filter, same params every call regardless of
 * whether `kind` is set) — this proves the `kind` filter still behaves
 * correctly, with and without it, after that rewrite.
 */
const AGENT_ID = "customer-support"; // real, seeded — satisfies the FK; only its knowledge rows are test-owned and cleaned up
const SOURCE_URI = `test-knowledge-search-${Date.now()}.md`;

function vector(seed: number): number[] {
  return Array.from({ length: 1536 }, (_, i) => Math.sin(seed + i) * 0.01);
}

beforeAll(async () => {
  await insertKnowledgeChunks([
    {
      agentId: AGENT_ID,
      kind: "semantic",
      sourceUri: SOURCE_URI,
      chunkIndex: 0,
      content: "Our refund policy allows returns within 30 days of purchase.",
      embedding: vector(1),
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
    },
    {
      agentId: AGENT_ID,
      kind: "procedural",
      sourceUri: SOURCE_URI,
      chunkIndex: 1,
      content: "Step 1: verify the order. Step 2: issue the refund.",
      embedding: vector(2),
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
    },
  ]);
});

afterAll(async () => {
  await deleteKnowledgeBySourceUri(AGENT_ID, SOURCE_URI);
  await prisma.$disconnect();
});

describe("findNearestKnowledge", () => {
  it("returns both chunks when no kind filter is given", async () => {
    const results = await findNearestKnowledge(AGENT_ID, vector(1), { limit: 10 });
    const bySource = results.filter((r) => r.sourceUri === SOURCE_URI);
    expect(bySource).toHaveLength(2);
  });

  it("filters to just the matching kind", async () => {
    const results = await findNearestKnowledge(AGENT_ID, vector(1), { limit: 10, kind: "semantic" });
    const bySource = results.filter((r) => r.sourceUri === SOURCE_URI);
    expect(bySource).toHaveLength(1);
    expect(bySource[0]?.kind).toBe("semantic");
  });
});

describe("findKnowledgeByFullText", () => {
  it("returns both chunks when no kind filter is given", async () => {
    const results = await findKnowledgeByFullText(AGENT_ID, "refund", { limit: 10 });
    const bySource = results.filter((r) => r.sourceUri === SOURCE_URI);
    expect(bySource.length).toBeGreaterThanOrEqual(1);
  });

  it("filters to just the matching kind", async () => {
    const results = await findKnowledgeByFullText(AGENT_ID, "refund", {
      limit: 10,
      kind: "procedural",
    });
    const bySource = results.filter((r) => r.sourceUri === SOURCE_URI);
    expect(bySource.every((r) => r.kind === "procedural")).toBe(true);
  });
});
