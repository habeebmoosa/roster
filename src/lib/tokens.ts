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
