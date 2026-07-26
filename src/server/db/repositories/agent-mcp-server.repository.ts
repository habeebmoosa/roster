import { prisma } from "@/server/db/prisma";

/** Which of a user's connected MCP servers are turned on for a given agent. */
export async function listEnabledMcpServerIds(userId: string, agentId: string): Promise<string[]> {
  const rows = await prisma.agentMcpServer.findMany({
    where: { userId, agentId },
    select: { mcpServerId: true },
  });
  return rows.map((row) => row.mcpServerId);
}

export async function enableMcpServerForAgent(
  userId: string,
  agentId: string,
  mcpServerId: string,
): Promise<void> {
  await prisma.agentMcpServer.upsert({
    where: { userId_agentId_mcpServerId: { userId, agentId, mcpServerId } },
    create: { userId, agentId, mcpServerId },
    update: {},
  });
}

export async function disableMcpServerForAgent(
  userId: string,
  agentId: string,
  mcpServerId: string,
): Promise<void> {
  await prisma.agentMcpServer.deleteMany({ where: { userId, agentId, mcpServerId } });
}
