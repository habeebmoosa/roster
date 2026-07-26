import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type McpServerDefinition, parseMcpServerDefinition } from "./directory";

/**
 * Node-only file loaders for the curated MCP server directory. Used by the DB
 * seed and any server-side tooling — never imported into a client bundle.
 * Mirrors core/agent/loader.ts's pattern for agent definitions.
 */
export function loadMcpServerDefinitionFile(filePath: string): McpServerDefinition {
  const raw = JSON.parse(readFileSync(filePath, "utf8"));
  return parseMcpServerDefinition(raw);
}

/** Load every `<dir>/*.json` file in the curated MCP server directory. */
export function loadAllMcpServerDefinitions(directory: string): McpServerDefinition[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => loadMcpServerDefinitionFile(join(directory, entry.name)));
}
