import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";

/**
 * Repository for AgentKnowledge — follows the same raw-SQL vector pattern as
 * embedding-probe.repository.ts (Prisma's client can't type vector columns).
 */

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

export interface NewKnowledgeChunk {
  agentId: string;
  kind: "semantic" | "procedural";
  sourceUri: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  embeddingProvider: string;
  embeddingModel: string;
  permissions?: string[];
}

/** Remove any existing chunks for a source before re-ingesting it (idempotent ingestion). */
export async function deleteKnowledgeBySourceUri(
  agentId: string,
  sourceUri: string,
): Promise<void> {
  await prisma.agentKnowledge.deleteMany({ where: { agentId, sourceUri } });
}

export async function insertKnowledgeChunks(chunks: NewKnowledgeChunk[]): Promise<void> {
  for (const chunk of chunks) {
    const vector = toVectorLiteral(chunk.embedding);
    const permissions = chunk.permissions ?? [];
    await prisma.$executeRaw`
      INSERT INTO agent_knowledge
        (id, "agentId", kind, "sourceUri", "chunkIndex", content, embedding, "embeddingProvider", "embeddingModel", permissions, "createdAt")
      VALUES
        (${randomUUID()}, ${chunk.agentId}, ${chunk.kind}, ${chunk.sourceUri}, ${chunk.chunkIndex}, ${chunk.content}, ${vector}::vector, ${chunk.embeddingProvider}, ${chunk.embeddingModel}, ${permissions}::text[], now())
    `;
  }
}

export function countKnowledgeForAgent(agentId: string): Promise<number> {
  return prisma.agentKnowledge.count({ where: { agentId } });
}

export interface KnowledgeCandidate {
  id: string;
  sourceUri: string;
  kind: string;
  content: string;
  permissions: string[];
  /** Similarity/relevance score — NOT comparable between vector and full-text results. */
  score: number;
}

export interface KnowledgeSearchOptions {
  limit: number;
  kind?: "semantic" | "procedural";
  /**
   * Permission tags the caller has been granted. A chunk is visible only if
   * every tag on it is present in this set — [] (the default) means only
   * public (untagged) chunks are visible. See the AgentKnowledge doc comment
   * in schema.prisma.
   */
  grantedPermissions?: string[];
}

/** Cosine-similarity search (pgvector `<=>`). Score is 1 - distance (1 = identical). */
export async function findNearestKnowledge(
  agentId: string,
  embedding: number[],
  options: KnowledgeSearchOptions,
): Promise<KnowledgeCandidate[]> {
  const vector = toVectorLiteral(embedding);
  const grantedPermissions = options.grantedPermissions ?? [];
  // A fixed-shape query beats a conditionally-included SQL fragment
  // (Prisma.sql/Prisma.empty embedded in a larger tagged template has been an
  // unreliable pattern for parameter renumbering across Prisma versions) —
  // this always has the same placeholders; only the bound `kindFilter` value
  // changes between "no filter" (null) and a real kind.
  const kindFilter = options.kind ?? null;
  const rows = await prisma.$queryRaw<KnowledgeCandidate[]>`
    SELECT id, "sourceUri", kind, content, permissions, 1 - (embedding <=> ${vector}::vector) AS score
    FROM agent_knowledge
    WHERE "agentId" = ${agentId}
      AND permissions <@ ${grantedPermissions}::text[]
      AND (${kindFilter}::text IS NULL OR kind = ${kindFilter})
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${options.limit}
  `;
  return rows.map((row) => ({ ...row, score: Number(row.score) }));
}

/** Postgres full-text search (BM25-style ts_rank over the GIN index from 7.1). */
export async function findKnowledgeByFullText(
  agentId: string,
  query: string,
  options: KnowledgeSearchOptions,
): Promise<KnowledgeCandidate[]> {
  const grantedPermissions = options.grantedPermissions ?? [];
  const kindFilter = options.kind ?? null;
  const rows = await prisma.$queryRaw<KnowledgeCandidate[]>`
    SELECT id, "sourceUri", kind, content, permissions,
      ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) AS score
    FROM agent_knowledge
    WHERE "agentId" = ${agentId}
      AND permissions <@ ${grantedPermissions}::text[]
      AND to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
      AND (${kindFilter}::text IS NULL OR kind = ${kindFilter})
    ORDER BY score DESC
    LIMIT ${options.limit}
  `;
  return rows.map((row) => ({ ...row, score: Number(row.score) }));
}

export function listKnowledgeSourceUris(agentId: string): Promise<{ sourceUri: string }[]> {
  return prisma.agentKnowledge.findMany({
    where: { agentId },
    select: { sourceUri: true },
    distinct: ["sourceUri"],
  });
}
