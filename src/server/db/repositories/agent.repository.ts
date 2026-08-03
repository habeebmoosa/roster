import { preserveRuntimeModel, type AgentDefinition, parseAgentDefinition } from "@/core/agent";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/server/db/prisma";

export interface AgentSummary {
  id: string;
  name: string;
  role: string;
  /** The real configured default, if any (Model tab / hire wizard) — null means "falls back to the caller". */
  model: { provider: string; model: string } | null;
}

export async function listAgentSummaries(): Promise<AgentSummary[]> {
  const rows = await prisma.agent.findMany({
    select: { id: true, name: true, role: true, definition: true },
    orderBy: { name: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    model: parseAgentDefinition(row.definition).model ?? null,
  }));
}

/** Load and re-validate an agent's full definition from the DB. */
export async function getAgentDefinition(id: string): Promise<AgentDefinition | null> {
  const row = await prisma.agent.findUnique({ where: { id } });
  if (!row) return null;
  return parseAgentDefinition(row.definition);
}

/**
 * The single write path for the Agent table — every caller (hire wizard's
 * create route, the Model tab's PATCH route, the ingestion CLI) funnels
 * through here, so `model` is protected centrally, once, rather than relying
 * on each caller to remember `preserveRuntimeModel` itself (a prior version
 * of this function didn't, and it silently regressed at least twice — a
 * caller that legitimately wants to clear the model has to go through
 * `preserveRuntimeModel`'s own escape hatch, an explicit `fresh.model`).
 */
export async function upsertAgent(definition: AgentDefinition): Promise<void> {
  const existingRow = await prisma.agent.findUnique({ where: { id: definition.id } });
  const existing = existingRow ? parseAgentDefinition(existingRow.definition) : null;
  const merged = preserveRuntimeModel(definition, existing);
  const data = {
    name: merged.name,
    role: merged.role,
    definition: merged as unknown as Prisma.InputJsonValue,
  };
  await prisma.agent.upsert({
    where: { id: definition.id },
    create: { id: definition.id, ...data },
    update: data,
  });
}
