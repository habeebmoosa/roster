import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import {
  disableMcpServerForAgent,
  enableMcpServerForAgent,
  listEnabledMcpServerIds,
} from "@/server/db/repositories/agent-mcp-server.repository";
import { createCustomMcpServer } from "@/server/db/repositories/mcp-server.repository";

/**
 * Direct coverage for agent-mcp-server.repository.ts — previously only
 * exercised indirectly through resolveMcpToolsForAgent
 * (agent-mcp-tools.test.ts), never its own CRUD contract in isolation.
 */
const AGENT_ID = "customer-support"; // real, seeded — satisfies the FK; only this test's own rows are touched
let userId: string;
const SERVER_A = `test-repo-server-a-${Date.now()}`;
const SERVER_B = `test-repo-server-b-${Date.now()}`;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `agent-mcp-server-repo-${Date.now()}@test.local` },
  });
  userId = user.id;

  for (const id of [SERVER_A, SERVER_B]) {
    await createCustomMcpServer({
      id,
      name: id,
      description: "A server for agent-mcp-server.repository tests",
      connectorUrl: "http://localhost:1/mcp",
      authType: "static_headers",
      categories: [],
      createdByUserId: userId,
    });
  }
});

afterAll(async () => {
  await prisma.agentMcpServer.deleteMany({ where: { userId } });
  await prisma.mcpServer.deleteMany({ where: { id: { in: [SERVER_A, SERVER_B] } } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await prisma.$disconnect();
});

describe("listEnabledMcpServerIds", () => {
  it("is empty for an agent with nothing enabled", async () => {
    expect(await listEnabledMcpServerIds(userId, AGENT_ID)).toEqual([]);
  });
});

describe("enableMcpServerForAgent", () => {
  it("enables a server for an agent, listed thereafter", async () => {
    await enableMcpServerForAgent(userId, AGENT_ID, SERVER_A);
    expect(await listEnabledMcpServerIds(userId, AGENT_ID)).toEqual([SERVER_A]);
  });

  it("is idempotent — enabling the same server twice doesn't duplicate it", async () => {
    await enableMcpServerForAgent(userId, AGENT_ID, SERVER_A);
    await enableMcpServerForAgent(userId, AGENT_ID, SERVER_A);
    expect(await listEnabledMcpServerIds(userId, AGENT_ID)).toEqual([SERVER_A]);
  });

  it("supports more than one server enabled for the same agent", async () => {
    await enableMcpServerForAgent(userId, AGENT_ID, SERVER_B);
    expect(await listEnabledMcpServerIds(userId, AGENT_ID).then((ids) => ids.sort())).toEqual(
      [SERVER_A, SERVER_B].sort(),
    );
  });
});

describe("disableMcpServerForAgent", () => {
  it("disables just the given server, leaving others enabled", async () => {
    await disableMcpServerForAgent(userId, AGENT_ID, SERVER_A);
    expect(await listEnabledMcpServerIds(userId, AGENT_ID)).toEqual([SERVER_B]);
  });

  it("is a safe no-op when the server wasn't enabled", async () => {
    await expect(disableMcpServerForAgent(userId, AGENT_ID, SERVER_A)).resolves.toBeUndefined();
    expect(await listEnabledMcpServerIds(userId, AGENT_ID)).toEqual([SERVER_B]);
  });
});
