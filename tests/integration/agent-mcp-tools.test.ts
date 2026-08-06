import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { startMockMcpServer, type MockMcpServer } from "@/core/mcp/test-mock-server";
import { callTool } from "@/core/tools/test-helpers";
import { prisma } from "@/server/db/prisma";
import { upsertAgent } from "@/server/db/repositories/agent.repository";
import { enableMcpServerForAgent } from "@/server/db/repositories/agent-mcp-server.repository";
import { createCustomMcpServer } from "@/server/db/repositories/mcp-server.repository";
import { connectManually } from "@/server/mcp/connect-service";
import { resolveMcpToolsForAgent } from "@/server/mcp/agent-tools-service";

/**
 * Proves the real "user connects + enables a server → the agent gets live,
 * callable MCP tools" path (10.7): resolveMcpToolsForAgent against a real mock
 * MCP server (the same double core/mcp unit-tests the client against), reached
 * through the real McpConnection/AgentMcpServer repositories from Phase 10.5.
 */
const AGENT_ID = "customer-support";
let userId: string;
let mock: MockMcpServer;
const SERVER_ID = `test-agent-mcp-server-${Date.now()}`;

beforeAll(async () => {
  await upsertAgent(loadAgentDefinitionFile(`agents/${AGENT_ID}/agent.yaml`));
  const user = await prisma.user.create({
    data: { email: `agent-mcp-tools-${Date.now()}@test.local` },
  });
  userId = user.id;
  mock = await startMockMcpServer();

  await createCustomMcpServer({
    id: SERVER_ID,
    name: "Test Agent MCP Server",
    description: "A server for agent-tools-service tests",
    connectorUrl: mock.url,
    authType: "static_headers",
    categories: [],
    createdByUserId: userId,
  });
});

afterAll(async () => {
  await prisma.agentMcpServer.deleteMany({ where: { userId } });
  await prisma.mcpConnection.deleteMany({ where: { userId } });
  await prisma.mcpServer.delete({ where: { id: SERVER_ID } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await mock.close();
  await prisma.$disconnect();
});

describe("resolveMcpToolsForAgent", () => {
  it("returns no tools when nothing is enabled for the agent", async () => {
    expect(await resolveMcpToolsForAgent(userId, AGENT_ID)).toEqual({});
  });

  it("returns no tools when enabled but not connected", async () => {
    await enableMcpServerForAgent(userId, AGENT_ID, SERVER_ID);
    expect(await resolveMcpToolsForAgent(userId, AGENT_ID)).toEqual({});
  });

  it("returns live, callable tools once connected and enabled", async () => {
    await connectManually(userId, SERVER_ID, { "x-api-key": "secret" });

    const tools = await resolveMcpToolsForAgent(userId, AGENT_ID);

    expect(Object.keys(tools).sort()).toEqual([
      `mcp_${SERVER_ID}_echo`,
      `mcp_${SERVER_ID}_fail`,
      `mcp_${SERVER_ID}_list_resources`,
      `mcp_${SERVER_ID}_read_resource`,
    ]);

    const result = await callTool(tools[`mcp_${SERVER_ID}_echo`]!, { greeting: "hi" });
    expect(result).toMatchObject({ isError: false });
    expect(result.content).toContain("greeting");

    expect(tools[`mcp_${SERVER_ID}_echo`]?.metadata).toEqual({
      source: "mcp",
      serverId: SERVER_ID,
      serverName: "Test Agent MCP Server",
    });
  });

  it("also resolves resource list/read tools from the same connected server", async () => {
    const tools = await resolveMcpToolsForAgent(userId, AGENT_ID);

    const listed = await callTool<Record<string, never>, Array<{ uri: string }>>(
      tools[`mcp_${SERVER_ID}_list_resources`]!,
      {},
    );
    expect(listed.map((r) => r.uri)).toEqual(["res://a", "res://b"]);

    const read = await callTool<{ uri: string }, Array<{ text?: string }>>(
      tools[`mcp_${SERVER_ID}_read_resource`]!,
      { uri: "res://a" },
    );
    expect(read[0]?.text).toBe("resource A content");
  });
});
