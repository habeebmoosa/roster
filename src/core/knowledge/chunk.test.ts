import { describe, expect, it } from "vitest";
import { countTokens } from "@/lib/tokens";
import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("returns no chunks for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const chunks = chunkText("Paragraph one.\n\nParagraph two.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({ index: 0, content: "Paragraph one.\n\nParagraph two." });
  });

  it("splits long text into multiple token-bounded chunks", () => {
    const paragraphs = Array.from(
      { length: 20 },
      (_, i) => `This is paragraph number ${i}, with a bit of extra padding text to add tokens.`,
    );
    const text = paragraphs.join("\n\n");

    const chunks = chunkText(text, { maxTokens: 50, overlapTokens: 10 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // Some slack: a single paragraph plus overlap can slightly exceed maxTokens
      // before the next-paragraph check triggers a new chunk.
      expect(countTokens(chunk.content)).toBeLessThan(80);
    }
  });

  it("indexes chunks sequentially starting at 0", () => {
    const paragraphs = Array.from({ length: 10 }, (_, i) => `Paragraph ${i} text content here.`);
    const chunks = chunkText(paragraphs.join("\n\n"), { maxTokens: 20, overlapTokens: 5 });
    expect(chunks.map((c) => c.index)).toEqual(chunks.map((_, i) => i));
  });

  it("carries trailing overlap into the next chunk", () => {
    const paragraphs = ["Alpha paragraph with some words.", "Beta paragraph with some words too."];
    const chunks = chunkText(paragraphs.join("\n\n"), { maxTokens: 8, overlapTokens: 8 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // The overlap carries the end of the previous chunk into the next one.
    expect(chunks[1]!.content).toContain("Alpha paragraph with some words.");
  });

  it("falls back to sentence-splitting a single paragraph that exceeds maxTokens alone", () => {
    const longParagraph = Array.from(
      { length: 15 },
      (_, i) => `This is sentence number ${i} in one very long paragraph.`,
    ).join(" ");

    const chunks = chunkText(longParagraph, { maxTokens: 20, overlapTokens: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.content).join(" ")).toContain("sentence number 0");
    expect(chunks.map((c) => c.content).join(" ")).toContain("sentence number 14");
  });

  it("is deterministic for the same input", () => {
    const text = "Para one.\n\nPara two.\n\nPara three with more words in it.";
    expect(chunkText(text, { maxTokens: 5, overlapTokens: 2 })).toEqual(
      chunkText(text, { maxTokens: 5, overlapTokens: 2 }),
    );
  });
});
