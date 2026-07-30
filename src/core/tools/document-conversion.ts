import { tool } from "ai";
import { z } from "zod";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { parse as parseMarkdown } from "marked";
import TurndownService from "turndown";

/** Every built-in document-conversion tool takes base64-encoded file bytes, never a URL or filesystem path — these tools never make network calls. */
const base64ContentSchema = z.string().min(1).describe("The file's contents, base64-encoded.");

export const convertPdfToText = tool({
  description:
    "Extract plain text from a PDF file. Input is the PDF's raw bytes, base64-encoded. Returns the concatenated text of every page plus the page count.",
  inputSchema: z.object({
    base64Content: base64ContentSchema,
  }),
  execute: async ({ base64Content }) => {
    const buffer = Buffer.from(base64Content, "base64");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return { text: result.text, pageCount: result.total };
    } finally {
      await parser.destroy();
    }
  },
});

export const convertDocxToText = tool({
  description:
    "Extract plain text from a Word (.docx) file. Input is the file's raw bytes, base64-encoded.",
  inputSchema: z.object({
    base64Content: base64ContentSchema,
  }),
  execute: async ({ base64Content }) => {
    const buffer = Buffer.from(base64Content, "base64");
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value };
  },
});

export const convertMarkdownToHtml = tool({
  description: "Convert Markdown text to HTML.",
  inputSchema: z.object({
    markdown: z.string().min(1),
  }),
  execute: async ({ markdown }) => {
    const html = await parseMarkdown(markdown, { async: true });
    return { html };
  },
});

export const convertHtmlToMarkdown = tool({
  description: "Convert HTML to Markdown.",
  inputSchema: z.object({
    html: z.string().min(1),
  }),
  execute: async ({ html }) => {
    const turndownService = new TurndownService({ headingStyle: "atx" });
    return { markdown: turndownService.turndown(html) };
  },
});
