import { countTokens } from "@/lib/tokens";

export interface Chunk {
  index: number;
  content: string;
}

export interface ChunkOptions {
  /** Target max tokens per chunk. */
  maxTokens?: number;
  /** Trailing tokens carried into the next chunk for context continuity. */
  overlapTokens?: number;
}

const DEFAULT_MAX_TOKENS = 300;
const DEFAULT_OVERLAP_TOKENS = 50;

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Fallback for a single paragraph that alone exceeds the token budget. */
function splitOversizedParagraph(paragraph: string, maxTokens: number): string[] {
  const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(Boolean);
  const pieces: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = countTokens(sentence);
    if (currentTokens + sentenceTokens > maxTokens && current.length > 0) {
      pieces.push(current.join(" "));
      current = [];
      currentTokens = 0;
    }
    current.push(sentence);
    currentTokens += sentenceTokens;
  }
  if (current.length > 0) pieces.push(current.join(" "));
  return pieces;
}

/** Trailing paragraphs (in original order) worth up to `overlapTokens`. */
function takeTrailingOverlap(paragraphs: string[], overlapTokens: number): string[] {
  const result: string[] = [];
  let tokens = 0;
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const paragraphTokens = countTokens(paragraphs[i]!);
    if (tokens + paragraphTokens > overlapTokens && result.length > 0) break;
    result.unshift(paragraphs[i]!);
    tokens += paragraphTokens;
  }
  return result;
}

/**
 * Split markdown-ish text into overlapping, token-bounded chunks along
 * paragraph boundaries (falling back to sentence boundaries for a single
 * oversized paragraph). Pure and deterministic — same input, same output.
 */
export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const overlapTokens = options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;

  const paragraphs = splitIntoParagraphs(text);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = countTokens(paragraph);

    if (paragraphTokens > maxTokens) {
      if (current.length > 0) {
        chunks.push(current.join("\n\n"));
        current = [];
        currentTokens = 0;
      }
      chunks.push(...splitOversizedParagraph(paragraph, maxTokens));
      continue;
    }

    if (currentTokens + paragraphTokens > maxTokens && current.length > 0) {
      chunks.push(current.join("\n\n"));
      current = takeTrailingOverlap(current, overlapTokens);
      currentTokens = countTokens(current.join("\n\n"));
    }

    current.push(paragraph);
    currentTokens += paragraphTokens;
  }

  if (current.length > 0) chunks.push(current.join("\n\n"));

  return chunks
    .map((c) => c.trim())
    .filter(Boolean)
    .map((content, index) => ({ index, content }));
}
