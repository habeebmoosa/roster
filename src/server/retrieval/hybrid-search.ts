import { embedTexts, type ResolveEmbeddingModelInput } from "@/core/providers";
import { reciprocalRankFusion, type RankedCandidate } from "@/core/retrieval";
import {
  findKnowledgeByFullText,
  findNearestKnowledge,
} from "@/server/db/repositories/agent-knowledge.repository";

export interface HybridSearchInput {
  agentId: string;
  query: string;
  embedInput: ResolveEmbeddingModelInput;
  /** Final merged candidate count. MVP-Plan targets 30-50; defaults to 40. */
  limit?: number;
  kind?: "semantic" | "procedural";
  grantedPermissions?: string[];
}

/**
 * Hybrid retrieval: pgvector cosine similarity + Postgres full-text search,
 * fused into one ranked candidate set (30-50 chunks) for the re-ranker (7.4)
 * to narrow down. The query is embedded through the SAME provider/model an
 * agent's knowledge was ingested with — the caller is responsible for that
 * (see AgentKnowledge doc comment in schema.prisma).
 */
export async function hybridSearch(input: HybridSearchInput): Promise<RankedCandidate[]> {
  const limit = input.limit ?? 40;
  const searchOptions = {
    limit,
    kind: input.kind,
    grantedPermissions: input.grantedPermissions,
  };

  const [queryEmbedding] = await embedTexts(input.embedInput, [input.query]);

  const [vectorResults, fullTextResults] = await Promise.all([
    findNearestKnowledge(input.agentId, queryEmbedding!, searchOptions),
    findKnowledgeByFullText(input.agentId, input.query, searchOptions),
  ]);

  return reciprocalRankFusion([vectorResults, fullTextResults], limit);
}
