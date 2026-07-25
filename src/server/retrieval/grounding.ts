import type { LanguageModel } from "ai";
import { assembleContext, rerankCandidates, type AssembledContext } from "@/core/retrieval";
import type { ResolveEmbeddingModelInput } from "@/core/providers";
import { hybridSearch } from "./hybrid-search";

export interface RetrieveGroundingContextInput {
  agentId: string;
  query: string;
  embedInput: ResolveEmbeddingModelInput;
  /** Reuses the conversation's own chat model as the re-ranker — no separate model needed. */
  model: LanguageModel;
  budgetTokens: number;
  grantedPermissions?: string[];
}

/**
 * The full retrieval pipeline built across 7.3-7.5, composed into one call:
 * hybrid search -> re-rank -> hard-capped context assembly. This is what
 * runAgent()'s `retrievedContext` is built from (wired in 7.6).
 */
export async function retrieveGroundingContext(
  input: RetrieveGroundingContextInput,
): Promise<AssembledContext> {
  const candidates = await hybridSearch({
    agentId: input.agentId,
    query: input.query,
    embedInput: input.embedInput,
    grantedPermissions: input.grantedPermissions,
  });
  const reranked = await rerankCandidates({ query: input.query, candidates, model: input.model });
  return assembleContext(reranked, input.budgetTokens);
}
