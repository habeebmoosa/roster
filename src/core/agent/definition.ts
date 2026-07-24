import { z } from "zod";

/**
 * The portable agent definition — an employee's identity, expertise, and wiring.
 * This is Roster's open spec (the future marketplace format). Definitions live
 * as YAML files in `agents/` and are seeded into the DB.
 *
 * Phase 4 uses identity/voice/role/expertise for the system prompt. `abilities`
 * (tools), `memory`, and `context_budget_tokens` are part of the spec now but
 * are wired up in later phases (retrieval, tools, workflow).
 */
export const agentDefinitionSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "id must be kebab-case (lowercase letters, digits, hyphens)"),
  name: z.string().min(1),
  role: z.string().min(1),
  identity: z.string().min(1),
  voice: z.string().min(1),
  expertise: z.array(z.string()).default([]),
  abilities: z.array(z.string()).default([]),
  memory: z
    .object({
      semantic: z.array(z.string()).default([]),
      procedural: z.array(z.string()).default([]),
    })
    .default({ semantic: [], procedural: [] }),
  context_budget_tokens: z.number().int().positive().default(8000),
  // The hire wizard's default provider/model (Phase 6.10). Optional — the
  // launch employees seeded from YAML don't set one; chat still lets a user
  // pick a model per-request regardless of what's stored here.
  model: z
    .object({
      provider: z.string().min(1),
      model: z.string().min(1),
    })
    .optional(),
});

export type AgentDefinition = z.infer<typeof agentDefinitionSchema>;

/** Parse + validate a raw (YAML/JSON) object into an AgentDefinition. Throws on invalid input. */
export function parseAgentDefinition(raw: unknown): AgentDefinition {
  const result = agentDefinitionSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid agent definition: ${issues}`);
  }
  return result.data;
}
