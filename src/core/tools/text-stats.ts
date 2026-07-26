import { tool } from "ai";
import { z } from "zod";

const AVERAGE_WORDS_PER_MINUTE = 200;

export function computeTextStats(text: string) {
  const trimmed = text.trim();
  const words = trimmed.length === 0 ? [] : trimmed.split(/\s+/);
  const wordCount = words.length;
  const characterCount = text.length;
  const characterCountNoSpaces = text.replace(/\s/g, "").length;
  const sentenceCount = trimmed.length === 0 ? 0 : (trimmed.match(/[.!?]+(?:\s|$)/g) ?? []).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / AVERAGE_WORDS_PER_MINUTE));

  return {
    wordCount,
    characterCount,
    characterCountNoSpaces,
    sentenceCount,
    readingTimeMinutes,
  };
}

export const countTextStats = tool({
  description:
    "Count words, characters, and sentences in a piece of text, and estimate its reading time.",
  inputSchema: z.object({
    text: z.string().describe("The text to analyze."),
  }),
  execute: async ({ text }) => computeTextStats(text),
});
