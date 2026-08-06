import { afterEach, describe, expect, it } from "vitest";
import { mcpToolId, wrapMcpToolsForAgent } from "./agent-tools";
import { McpClient } from "./client";
import { callTool } from "../tools/test-helpers";
import { startMockMcpServer, type MockMcpServer } from "./test-mock-server";

describe("mcpToolId", () => {
  it("namespaces a tool name by server id", () => {
    expect(mcpToolId("notion", "search")).toBe("mcp_notion_search");
  });
});

describe("wrapMcpToolsForAgent", () => {
  let mock: MockMcpServer;

  afterEach(async () => {
    await mock.close();
  });

  it("wraps every tool from every bound server, namespaced by server id", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();
    const tools = await client.listTools();

    const wrapped = wrapMcpToolsForAgent([{ serverId: "acme", serverName: "Acme", client, tools }]);

    expect(Object.keys(wrapped).sort()).toEqual(["mcp_acme_echo", "mcp_acme_fail"]);
  });

  it("tags every tool — including the resource pair — with its source server's id and name", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();
    const tools = await client.listTools();
    const resources = await client.listResources();

    const wrapped = wrapMcpToolsForAgent([
      { serverId: "acme", serverName: "Acme CRM", client, tools, resources },
    ]);

    const expected = { source: "mcp", serverId: "acme", serverName: "Acme CRM" };
    expect(wrapped.mcp_acme_echo?.metadata).toEqual(expected);
    expect(wrapped.mcp_acme_fail?.metadata).toEqual(expected);
    expect(wrapped[mcpToolId("acme", "list_resources")]?.metadata).toEqual(expected);
    expect(wrapped[mcpToolId("acme", "read_resource")]?.metadata).toEqual(expected);
  });

  it("returns the tool's result content as a normal (non-throwing) value, even when isError is true", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();
    const tools = await client.listTools();
    const wrapped = wrapMcpToolsForAgent([{ serverId: "acme", serverName: "Acme", client, tools }]);

    const failResult = await callTool(wrapped.mcp_acme_fail!, {});
    expect(failResult).toMatchObject({ isError: true });
    expect(failResult.content).toContain("failed");
  });

  it("returns a successful call's content with isError false", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();
    const tools = await client.listTools();
    const wrapped = wrapMcpToolsForAgent([{ serverId: "acme", serverName: "Acme", client, tools }]);

    const echoResult = await callTool(wrapped.mcp_acme_echo!, { greeting: "hi" });
    expect(echoResult.isError).toBe(false);
    expect(echoResult.content).toContain("greeting");
  });

  it("throws for a genuine protocol-level error (unknown tool), never swallowing it", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();
    // A hand-built binding pointing at a tool name the mock server doesn't recognize.
    const wrapped = wrapMcpToolsForAgent([
      {
        serverId: "acme",
        serverName: "Acme",
        client,
        tools: [{ name: "does-not-exist", description: "d", inputSchema: { type: "object" } }],
      },
    ]);

    const toolDef = wrapped[mcpToolId("acme", "does-not-exist")]!;
    await expect(callTool(toolDef, {})).rejects.toThrow();
  });

  it("does not add resource tools for a server with no resources", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();
    const tools = await client.listTools();

    const wrapped = wrapMcpToolsForAgent([
      { serverId: "acme", serverName: "Acme", client, tools, resources: [] },
    ]);

    expect(wrapped).not.toHaveProperty(mcpToolId("acme", "list_resources"));
    expect(wrapped).not.toHaveProperty(mcpToolId("acme", "read_resource"));
  });

  it("adds list_resources/read_resource tools for a server that has resources", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();
    const tools = await client.listTools();
    const resources = await client.listResources();

    const wrapped = wrapMcpToolsForAgent([
      { serverId: "acme", serverName: "Acme", client, tools, resources },
    ]);

    const listed = await callTool<Record<string, never>, Array<{ uri: string }>>(
      wrapped[mcpToolId("acme", "list_resources")]!,
      {},
    );
    expect(listed.map((r) => r.uri)).toEqual(["res://a", "res://b"]);

    const read = await callTool<{ uri: string }, Array<{ text?: string }>>(
      wrapped[mcpToolId("acme", "read_resource")]!,
      { uri: "res://a" },
    );
    expect(read[0]?.text).toBe("resource A content");
  });
});
