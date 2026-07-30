import { countTokens, truncateToTokenBudget } from "@/lib/tokens";
import type { RankedCandidate } from "./rank-fusion";

export interface AssembledContext {
  /** Ready to inject into the system prompt — labeled per-chunk, never a raw dump. */
  text: string;
  usedChunkIds: string[];
  /** sourceUri of each used chunk (parallel to usedChunkIds) — what eval retrieval graders check. */
  usedSourceUris: string[];
  totalTokens: number;
  /** True if at least one candidate (or part of one) didn't fit within the budget. */
  truncated: boolean;
}

function formatChunk(candidate: RankedCandidate): string {
  const label = candidate.kind === "procedural" ? "Playbook" : "Knowledge";
  return `[${label}: ${candidate.sourceUri}]\n${candidate.content}`;
}

/**
 * Assemble re-ranked candidates into a single grounded context block, never
 * exceeding `budgetTokens` (the agent's context_budget_tokens) — the hard cap
 * this project's whole retrieval design exists to enforce (CLAUDE.md: "less
 * context, not more"). Candidates are consumed in the given (most-relevant-
 * first) order; the first one that doesn't fit stops assembly rather than
 * skipping ahead to a smaller, less-relevant candidate, which would produce a
 * confusing, out-of-priority-order context.
 *
 * If even the single most relevant candidate doesn't fit, it's truncated to
 * fit rather than leaving the agent with no grounding at all.
 */
export function assembleContext(
  candidates: RankedCandidate[],
  budgetTokens: number,
): AssembledContext {
  const sections: string[] = [];
  const usedChunkIds: string[] = [];
  const usedSourceUris: string[] = [];
  let totalTokens = 0;
  let truncated = false;

  for (const candidate of candidates) {
    const remaining = budgetTokens - totalTokens;
    if (remaining <= 0) {
      truncated = true;
      break;
    }

    const section = formatChunk(candidate);
    const sectionTokens = countTokens(section);

    if (sectionTokens <= remaining) {
      sections.push(section);
      usedChunkIds.push(candidate.id);
      usedSourceUris.push(candidate.sourceUri);
      totalTokens += sectionTokens;
      continue;
    }

    if (sections.length === 0) {
      const shortened = truncateToTokenBudget(section, remaining);
      const shortenedTokens = countTokens(shortened);
      if (shortenedTokens > 0) {
        sections.push(shortened);
        usedChunkIds.push(candidate.id);
        usedSourceUris.push(candidate.sourceUri);
        totalTokens += shortenedTokens;
      }
    }
    truncated = true;
    break;
  }

  return { text: sections.join("\n\n"), usedChunkIds, usedSourceUris, totalTokens, truncated };
}
