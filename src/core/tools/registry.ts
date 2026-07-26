import type { Tool } from "ai";
import { calculate } from "./calculator";
import { dateTimeMath } from "./date-math";
import {
  convertDocxToText,
  convertHtmlToMarkdown,
  convertMarkdownToHtml,
  convertPdfToText,
} from "./document-conversion";
import { countTextStats } from "./text-stats";

/**
 * Every built-in tool, keyed by the id an agent definition's `abilities` array
 * uses to enable it — no separate data model, no connection step (10.1's
 * plan decision). MCP tools are a second, DB-backed source composed
 * alongside this one at request time (server/agents/service.ts, 10.7).
 */
export const BUILT_IN_TOOLS: Record<string, Tool> = {
  convert_pdf_to_text: convertPdfToText,
  convert_docx_to_text: convertDocxToText,
  convert_markdown_to_html: convertMarkdownToHtml,
  convert_html_to_markdown: convertHtmlToMarkdown,
  calculate,
  count_text_stats: countTextStats,
  date_time_math: dateTimeMath,
};

/** The subset of BUILT_IN_TOOLS an agent's `abilities` list enables, ignoring any id that isn't a real built-in tool (e.g. a descriptive-only ability like "draft_reply"). */
export function resolveBuiltInTools(abilities: string[]): Record<string, Tool> {
  const tools: Record<string, Tool> = {};
  for (const ability of abilities) {
    if (Object.hasOwn(BUILT_IN_TOOLS, ability)) {
      tools[ability] = BUILT_IN_TOOLS[ability]!;
    }
  }
  return tools;
}
