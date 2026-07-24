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

export function listKnowledgeSourceUris(agentId: string): Promise<{ sourceUri: string }[]> {
  return prisma.agentKnowledge.findMany({
    where: { agentId },
    select: { sourceUri: true },
    distinct: ["sourceUri"],
  });
}
