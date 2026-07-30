import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { upsertAgent } from "@/server/db/repositories/agent.repository";
import {
  disableMcpServerForAgent,
  enableMcpServerForAgent,
  listEnabledMcpServerIds,
} from "@/server/db/repositories/agent-mcp-server.repository";
import {
  deleteMcpConnection,
  getMcpConnectionWithSecret,
  listMcpConnections,
  updateMcpConnectionCredentials,
  upsertMcpConnection,
} from "@/server/db/repositories/mcp-connection.repository";
import {
  getMcpServer,
  listMcpServers,
  updateMcpServerCapabilities,
  upsertMcpServerFromDefinition,
} from "@/server/db/repositories/mcp-server.repository";
import { encryptConnectionCredentials } from "@/server/mcp/vault";
import { prisma } from "@/server/db/prisma";

const AGENT_ID = "customer-support";
const TEST_SERVER_ID = `test-mcp-server-${Date.now()}`;
let userId: string;

beforeAll(async () => {
  await upsertAgent(loadAgentDefinitionFile(`agents/${AGENT_ID}/agent.yaml`));
  const user = await prisma.user.create({
    data: { email: `mcp-directory-${Date.now()}@test.local` },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.agentMcpServer.deleteMany({ where: { userId } });
  await prisma.mcpConnection.deleteMany({ where: { userId } });
  await prisma.mcpServer.delete({ where: { id: TEST_SERVER_ID } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await prisma.$disconnect();
});

describe("mcp-server repository", () => {
  it("seeds the real curated directory with the expected trust tiers and tool counts", async () => {
    const servers = await listMcpServers();
    expect(servers.length).toBeGreaterThanOrEqual(9);
    const notion = servers.find((s) => s.id === "notion");
    expect(notion?.trustTier).toBe("verified");
    expect(notion?.cachedTools.length).toBeGreaterThan(0);
  });

  it("upserts a server from a definition and fetches it back", async () => {
    await upsertMcpServerFromDefinition({
      id: TEST_SERVER_ID,
      name: "Test Server",
      description: "A server for repository tests",
      connectorUrl: "https://mcp.test.example/mcp",
      authType: "static_headers",
      categories: ["Testing"],
      trustTier: "custom",
      tools: [{ name: "ping", description: "Ping the test server" }],
      resources: [],
    });

    const server = await getMcpServer(TEST_SERVER_ID);
    expect(server).not.toBeNull();
    expect(server!.name).toBe("Test Server");
    expect(server!.cachedTools).toEqual([{ name: "ping", description: "Ping the test server" }]);
  });

  it("overwrites cached capabilities with a live snapshot", async () => {
    await updateMcpServerCapabilities(
      TEST_SERVER_ID,
      [
        { name: "ping", description: "Ping" },
        { name: "pong", description: "Pong back" },
      ],
      [{ name: "status", description: "Server status" }],
    );
    const server = await getMcpServer(TEST_SERVER_ID);
    expect(server!.cachedTools).toHaveLength(2);
    expect(server!.cachedResources).toEqual([{ name: "status", description: "Server status" }]);
  });
});

describe("mcp-connection repository", () => {
  it("returns nothing for a user with no connection yet", async () => {
    expect(await getMcpConnectionWithSecret(userId, TEST_SERVER_ID)).toBeNull();
    expect(await listMcpConnections(userId)).toEqual([]);
  });

  it("stores and decrypts a static_headers connection", async () => {
    const encrypted = encryptConnectionCredentials({
      type: "static_headers",
      headers: { "x-api-key": "secret-123" },
    });

    await upsertMcpConnection({ userId, mcpServerId: TEST_SERVER_ID, credentials: encrypted });

    const connection = await getMcpConnectionWithSecret(userId, TEST_SERVER_ID);
    expect(connection).not.toBeNull();
    expect(connection!.status).toBe("active");
    expect(connection!.credentials).not.toContain("secret-123");

    const summaries = await listMcpConnections(userId);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).not.toHaveProperty("credentials");
  });

  it("upserting the same (user, server) replaces credentials rather than duplicating the row", async () => {
    const updated = encryptConnectionCredentials({ type: "static_headers", headers: { a: "b" } });
    await upsertMcpConnection({ userId, mcpServerId: TEST_SERVER_ID, credentials: updated });
    expect(await listMcpConnections(userId)).toHaveLength(1);
  });

  it("updates credentials in place after a refresh, without touching status", async () => {
    const refreshed = encryptConnectionCredentials({ type: "static_headers", headers: { c: "d" } });
    await updateMcpConnectionCredentials(userId, TEST_SERVER_ID, refreshed);
    const connection = await getMcpConnectionWithSecret(userId, TEST_SERVER_ID);
    expect(connection!.credentials).toBe(refreshed);
    expect(connection!.status).toBe("active");
  });

  it("deletes a connection", async () => {
    await deleteMcpConnection(userId, TEST_SERVER_ID);
    expect(await getMcpConnectionWithSecret(userId, TEST_SERVER_ID)).toBeNull();
  });
});

describe("agent-mcp-server repository", () => {
  it("starts with nothing enabled", async () => {
    expect(await listEnabledMcpServerIds(userId, AGENT_ID)).toEqual([]);
  });

  it("enables a server for an agent", async () => {
    await enableMcpServerForAgent(userId, AGENT_ID, TEST_SERVER_ID);
    expect(await listEnabledMcpServerIds(userId, AGENT_ID)).toEqual([TEST_SERVER_ID]);
  });

  it("enabling twice does not duplicate the enablement", async () => {
    await enableMcpServerForAgent(userId, AGENT_ID, TEST_SERVER_ID);
    expect(await listEnabledMcpServerIds(userId, AGENT_ID)).toEqual([TEST_SERVER_ID]);
  });

  it("disables a server for an agent", async () => {
    await disableMcpServerForAgent(userId, AGENT_ID, TEST_SERVER_ID);
    expect(await listEnabledMcpServerIds(userId, AGENT_ID)).toEqual([]);
  });
});
