import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { McpTransport } from "./transport";
import { McpProtocolError, McpTransportError } from "./errors";
import { startMockMcpServer, type MockMcpServer } from "./test-mock-server";

describe.each([
  ["JSON response mode", "json" as const],
  ["SSE response mode", "sse" as const],
])("McpTransport (%s)", (_label, responseMode) => {
  let mock: MockMcpServer;

  afterEach(async () => {
    await mock.close();
  });

  it("sends a JSON-RPC request and returns the unwrapped result", async () => {
    mock = await startMockMcpServer({ responseMode });
    const transport = new McpTransport(mock.url);

    const result = await transport.request<{ protocolVersion: string }>("initialize", {
      protocolVersion: "2025-06-18",
    });

    expect(result.protocolVersion).toBe("2025-06-18");
    expect(mock.requests[0]).toMatchObject({ method: "initialize", jsonrpc: "2.0" });
  });

  it("throws McpProtocolError on a JSON-RPC error response", async () => {
    mock = await startMockMcpServer({ responseMode });
    const transport = new McpTransport(mock.url);

    await expect(transport.request("tools/call", { name: "does-not-exist" })).rejects.toThrow(
      McpProtocolError,
    );
  });

  it("tracks and echoes back the Mcp-Session-Id header after the first response", async () => {
    mock = await startMockMcpServer({ responseMode });
    const transport = new McpTransport(mock.url);

    await transport.request("initialize", {});
    await transport.request("tools/list", {});

    expect(mock.sessionIdsSeen[0]).toBeUndefined();
    expect(mock.sessionIdsSeen[1]).toBe("mock-session-abc123");
  });

  it("sends notifications without expecting a JSON-RPC response", async () => {
    mock = await startMockMcpServer({ responseMode });
    const transport = new McpTransport(mock.url);

    await expect(transport.notify("notifications/initialized")).resolves.toBeUndefined();
    expect(mock.requests[0]).not.toHaveProperty("id");
  });
});

describe("McpTransport error handling", () => {
  it("throws on a raw network failure (nothing listening)", async () => {
    const transport = new McpTransport("http://127.0.0.1:1");
    await expect(transport.request("initialize", {})).rejects.toThrow();
  });

  it("surfaces WWW-Authenticate on a 401 so callers can start OAuth discovery (10.3)", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(401, {
        "www-authenticate":
          'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
      });
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      const transport = new McpTransport(`http://127.0.0.1:${port}`);
      await expect(transport.request("initialize", {})).rejects.toMatchObject({
        wwwAuthenticate:
          'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
      });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("does not conflate McpProtocolError with McpTransportError", () => {
    expect(new McpProtocolError(-32601, "not found")).not.toBeInstanceOf(McpTransportError);
    expect(new McpTransportError("bad status", 500)).not.toBeInstanceOf(McpProtocolError);
  });
});
