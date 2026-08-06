import { afterEach, describe, expect, it } from "vitest";
import { McpClient } from "./client";
import { startMockMcpServer, type MockMcpServer } from "./test-mock-server";

describe("McpClient", () => {
  let mock: MockMcpServer;

  afterEach(async () => {
    await mock.close();
  });

  it("requires initialize() before any other call", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await expect(client.listTools()).rejects.toThrow(/initialize/i);
  });

  it("initializes and sends the notifications/initialized follow-up", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);

    const info = await client.initialize();

    expect(info.serverInfo.name).toBe("mock-mcp-server");
    expect(mock.requests.map((r) => r.method)).toEqual(["initialize", "notifications/initialized"]);
  });

  it("collects every page when listing tools", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();

    const tools = await client.listTools();

    expect(tools.map((t) => t.name)).toEqual(["echo", "fail"]);
  });

  it("returns a tool's result, including its arguments round-tripped", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();

    const result = await client.callTool("echo", { greeting: "hi" });

    expect(result.isError).toBeFalsy();
    expect(result.content[0]?.text).toBe(JSON.stringify({ greeting: "hi" }));
  });

  it("returns isError:true as a normal result rather than throwing", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();

    const result = await client.callTool("fail", {});

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("failed");
  });

  it("throws for an unknown tool, a genuine protocol-level error", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();

    await expect(client.callTool("does-not-exist", {})).rejects.toThrow(/unknown tool/i);
  });

  it("collects every page when listing resources", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();

    const resources = await client.listResources();

    expect(resources.map((r) => r.uri)).toEqual(["res://a", "res://b"]);
  });

  it("reads a resource's contents", async () => {
    mock = await startMockMcpServer();
    const client = new McpClient(mock.url);
    await client.initialize();

    const contents = await client.readResource("res://a");

    expect(contents[0]?.text).toBe("resource A content");
  });

  it("skips resources/list entirely when the server never declared a resources capability", async () => {
    mock = await startMockMcpServer({ capabilities: { tools: {} } });
    const client = new McpClient(mock.url);
    await client.initialize();

    const resources = await client.listResources();

    expect(resources).toEqual([]);
    expect(mock.requests.map((r) => r.method)).not.toContain("resources/list");
  });

  it("skips tools/list entirely when the server never declared a tools capability", async () => {
    mock = await startMockMcpServer({ capabilities: { resources: {} } });
    const client = new McpClient(mock.url);
    await client.initialize();

    const tools = await client.listTools();

    expect(tools).toEqual([]);
    expect(mock.requests.map((r) => r.method)).not.toContain("tools/list");
  });
});
