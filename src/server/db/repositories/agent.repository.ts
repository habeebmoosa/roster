import { type AgentDefinition, parseAgentDefinition } from "@/core/agent";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/server/db/prisma";

export interface AgentSummary {
  id: string;
  name: string;
  role: string;
}

export function listAgentSummaries(): Promise<AgentSummary[]> {
  return prisma.agent.findMany({
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

/** Load and re-validate an agent's full definition from the DB. */
export async function getAgentDefinition(id: string): Promise<AgentDefinition | null> {
  const row = await prisma.agent.findUnique({ where: { id } });
  if (!row) return null;
  return parseAgentDefinition(row.definition);
}

export async function upsertAgent(definition: AgentDefinition): Promise<void> {
  const data = {
    name: definition.name,
    role: definition.role,
    definition: definition as unknown as Prisma.InputJsonValue,
  };
  await prisma.agent.upsert({
    where: { id: definition.id },
    create: { id: definition.id, ...data },
    update: data,
  });
}
