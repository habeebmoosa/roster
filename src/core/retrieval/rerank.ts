import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { RankedCandidate } from "./rank-fusion";

const DEFAULT_KEEP = 5;

const rerankResultSchema = z.object({
  rankedIds: z
    .array(z.string())
    .describe(
      "Candidate ids ordered from most to least relevant to the query. Omit any candidate that isn't actually relevant.",
    ),
});

function buildRerankPrompt(query: string, candidates: RankedCandidate[]): string {
  const items = candidates.map((c) => `[${c.id}]\n${c.content}`).join("\n\n---\n\n");
  return [
    "You are ranking knowledge snippets by relevance to a user's query, for a support employee to reference.",
    "",
    `Query: "${query}"`,
    "",
    "Candidates:",
    items,
  ].join("\n");
}

export interface RerankInput {
  query: string;
  candidates: RankedCandidate[];
  model: LanguageModel;
  /** How many to keep, most relevant first. Default 5 (MVP-Plan targets 3-5). */
  keep?: number;
}

/**
 * Score the hybrid-retrieval candidates with the caller's own chat model
 * (LLM-as-reranker) and keep the top few. This is the highest-leverage,
 * highest-tuning-priority component per MVP-Plan — it's what lets the final
 * context stay small (less context, not more) while still being the right
 * context.
 */
export async function rerankCandidates(input: RerankInput): Promise<RankedCandidate[]> {
  const { query, candidates, model } = input;
  const keep = input.keep ?? DEFAULT_KEEP;
  if (candidates.length === 0) return [];

  const byId = new Map(candidates.map((c) => [c.id, c]));

  let rankedIds: string[];
  try {
    const result = await generateObject({
      model,
      schema: rerankResultSchema,
      prompt: buildRerankPrompt(query, candidates),
    });
    rankedIds = result.object.rankedIds;
  } catch {
    // A model that fails to produce valid structured output shouldn't lose the
    // candidates entirely — fall back to the hybrid-search (RRF) order.
    return candidates.slice(0, keep);
  }

  const ranked = rankedIds
    .map((id) => byId.get(id))
    .filter((c): c is RankedCandidate => Boolean(c));

  return ranked.slice(0, keep);
}
