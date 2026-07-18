import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { type AgentDefinition, parseAgentDefinition } from "./definition";

/**
 * Node-only file loaders for agent definitions. Used by the DB seed and any
 * server-side tooling — never imported into a client bundle.
 */
export function loadAgentDefinitionFile(filePath: string): AgentDefinition {
  const raw = parseYaml(readFileSync(filePath, "utf8"));
  return parseAgentDefinition(raw);
}

/** Load every `<dir>/<slug>/agent.yaml` under an agents directory. */
export function loadAllAgentDefinitions(agentsDir: string): AgentDefinition[] {
  const definitions: AgentDefinition[] = [];
  for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(agentsDir, entry.name, "agent.yaml");
    if (existsSync(file)) definitions.push(loadAgentDefinitionFile(file));
  }
  return definitions;
}
