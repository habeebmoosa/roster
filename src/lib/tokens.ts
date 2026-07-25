import { encode } from "gpt-tokenizer";

/**
 * Token count for context-budget accounting (chunking, the hard cap in the
 * context assembler). cl100k_base is an approximation for non-OpenAI models,
 * but consistent counting matters more here than perfect per-provider parity.
 */
export function countTokens(text: string): number {
  if (text === "") return 0;
  return encode(text).length;
}

/**
 * Shorten `text` to fit within `maxTokens`, tokens permitting (binary search
 * on length). Shared by the retrieval context assembler and the workflow
 * compressor (Phase 8) — both need a mechanical, always-succeeds way to force
 * text under a hard token cap.
 */
export function truncateToTokenBudget(text: string, maxTokens: number): string {
  if (maxTokens <= 0) return "";
  if (countTokens(text) <= maxTokens) return text;

  // The trailing ellipsis itself costs tokens — reserve room for it up front
  // rather than appending it after the search and risking going back over budget.
  const ellipsis = "…";
  const targetTokens = Math.max(0, maxTokens - countTokens(ellipsis));

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (countTokens(text.slice(0, mid)) <= targetTokens) lo = mid;
    else hi = mid - 1;
  }
  if (lo === 0) return "";

  const withEllipsis = `${text.slice(0, lo).trimEnd()}${ellipsis}`;
  // Defensive re-check: trimEnd()/tokenizer boundary effects could still push
  // this over — never return more than maxTokens under any circumstance.
  return countTokens(withEllipsis) <= maxTokens ? withEllipsis : text.slice(0, lo).trimEnd();
}
