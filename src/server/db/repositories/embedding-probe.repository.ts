import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";

/**
 * Repository for the Phase 1 pgvector smoke model.
 *
 * Demonstrates the pattern every future vector table will follow: vector
 * columns are opaque to Prisma's typed client, so reads/writes and `<=>`
 * cosine-distance similarity go through parameterized raw SQL, wrapped behind
 * a repository so the rest of the app never touches SQL directly.
 */

/** Serialize a JS number[] into a pgvector literal, e.g. [1,0,0] → "[1,0,0]". */
function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

export interface NearestProbe {
  id: string;
  content: string;
  /** Cosine distance (0 = identical, 2 = opposite). */
  distance: number;
}

export async function createProbe(content: string, embedding: number[]): Promise<string> {
  const id = randomUUID();
  const vector = toVectorLiteral(embedding);
  await prisma.$executeRaw`
    INSERT INTO embedding_probe (id, content, embedding, "createdAt")
    VALUES (${id}, ${content}, ${vector}::vector, now())
  `;
  return id;
}

export async function findNearestProbes(embedding: number[], limit = 5): Promise<NearestProbe[]> {
  const vector = toVectorLiteral(embedding);
  const rows = await prisma.$queryRaw<Array<{ id: string; content: string; distance: number }>>`
    SELECT id, content, (embedding <=> ${vector}::vector) AS distance
    FROM embedding_probe
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    distance: Number(row.distance),
  }));
}

export async function clearProbes(): Promise<void> {
  await prisma.$executeRaw`DELETE FROM embedding_probe`;
}
