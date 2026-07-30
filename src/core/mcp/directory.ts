import { z } from "zod";

/**
 * The portable MCP server directory entry — Roster's curated-directory format.
 * Definitions live as JSON files in `mcp-servers/` and are seeded into the
 * McpServer table, the same "definitions-as-files, DB is a materialized copy"
 * pattern core/agent/definition.ts already uses for employees.
 *
 * `tools`/`resources` are a hand-curated snapshot for the Connectors UI to
 * render before a user ever connects — the live, authoritative list always
 * comes from the server's own tools/list + resources/list once connected
 * (core/mcp/client.ts), which overwrites McpServer.cachedTools/cachedResources.
 */
export const mcpServerDefinitionSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "id must be kebab-case (lowercase letters, digits, hyphens)"),
  name: z.string().min(1),
  description: z.string().min(1),
  iconUrl: z.string().url().optional(),
  developer: z.string().min(1).optional(),
  connectorUrl: z.string().url(),
  authType: z.enum(["oauth_dcr", "static_headers", "none"]),
  categories: z.array(z.string()).default([]),
  trustTier: z.enum(["verified", "community", "custom"]),
  documentationUrl: z.string().url().optional(),
  supportUrl: z.string().url().optional(),
  privacyPolicyUrl: z.string().url().optional(),
  tools: z.array(z.object({ name: z.string().min(1), description: z.string().min(1) })).default([]),
  resources: z
    .array(z.object({ name: z.string().min(1), description: z.string().min(1) }))
    .default([]),
});

export type McpServerDefinition = z.infer<typeof mcpServerDefinitionSchema>;

/** Parse + validate a raw (JSON) object into an McpServerDefinition. Throws on invalid input. */
export function parseMcpServerDefinition(raw: unknown): McpServerDefinition {
  const result = mcpServerDefinitionSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid MCP server definition: ${issues}`);
  }
  return result.data;
}
