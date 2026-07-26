import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export interface MockMcpServer {
  url: string;
  /** Parsed JSON-RPC request bodies received, in order (for assertions). */
  requests: Array<Record<string, unknown>>;
  /** `Mcp-Session-Id` header value seen on each request, in order (undefined if absent). */
  sessionIdsSeen: Array<string | undefined>;
  close: () => Promise<void>;
}

const SESSION_ID = "mock-session-abc123";

const TOOLS_PAGE_1 = [
  { name: "echo", description: "Echoes its input", inputSchema: { type: "object" } },
];
const TOOLS_PAGE_2 = [
  { name: "fail", description: "Always fails", inputSchema: { type: "object" } },
];

const RESOURCES_PAGE_1 = [{ uri: "res://a", name: "Resource A", mimeType: "text/plain" }];
const RESOURCES_PAGE_2 = [{ uri: "res://b", name: "Resource B", mimeType: "text/plain" }];

function jsonRpcSuccess(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function handleRequest(body: Record<string, unknown>): unknown {
  const { id, method, params } = body as {
    id?: unknown;
    method: string;
    params?: Record<string, unknown>;
  };

  switch (method) {
    case "initialize":
      return jsonRpcSuccess(id, {
        protocolVersion: "2025-06-18",
        serverInfo: { name: "mock-mcp-server", version: "1.0.0" },
        capabilities: { tools: {}, resources: {} },
      });

    case "tools/list": {
      const cursor = params?.cursor;
      if (!cursor) return jsonRpcSuccess(id, { tools: TOOLS_PAGE_1, nextCursor: "page2" });
      if (cursor === "page2") return jsonRpcSuccess(id, { tools: TOOLS_PAGE_2 });
      return jsonRpcError(id, -32602, `Invalid cursor "${String(cursor)}"`);
    }

    case "tools/call": {
      const name = params?.name;
      if (name === "echo") {
        return jsonRpcSuccess(id, {
          content: [{ type: "text", text: JSON.stringify(params?.arguments ?? {}) }],
        });
      }
      if (name === "fail") {
        return jsonRpcSuccess(id, {
          content: [{ type: "text", text: "the tool ran but failed" }],
          isError: true,
        });
      }
      return jsonRpcError(id, -32602, `Unknown tool "${String(name)}"`);
    }

    case "resources/list": {
      const cursor = params?.cursor;
      if (!cursor) return jsonRpcSuccess(id, { resources: RESOURCES_PAGE_1, nextCursor: "page2" });
      if (cursor === "page2") return jsonRpcSuccess(id, { resources: RESOURCES_PAGE_2 });
      return jsonRpcError(id, -32602, `Invalid cursor "${String(cursor)}"`);
    }

    case "resources/read": {
      const uri = params?.uri;
      if (uri === "res://a") {
        return jsonRpcSuccess(id, {
          contents: [{ uri, mimeType: "text/plain", text: "resource A content" }],
        });
      }
      return jsonRpcError(id, -32602, `Unknown resource "${String(uri)}"`);
    }

    default:
      return jsonRpcError(id, -32601, `Method not found: "${method}"`);
  }
}

export async function startMockMcpServer(
  opts: { responseMode?: "json" | "sse" } = {},
): Promise<MockMcpServer> {
  const requests: Array<Record<string, unknown>> = [];
  const sessionIdsSeen: Array<string | undefined> = [];
  const responseMode = opts.responseMode ?? "json";

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = JSON.parse(raw) as Record<string, unknown>;
      requests.push(body);
      sessionIdsSeen.push(req.headers["mcp-session-id"] as string | undefined);

      res.setHeader("mcp-session-id", SESSION_ID);

      const isNotification = !("id" in body);
      if (isNotification) {
        res.writeHead(202);
        res.end();
        return;
      }

      const message = handleRequest(body);

      if (responseMode === "sse") {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
        res.write(`data: ${JSON.stringify(message)}\n\n`);
        res.end();
        return;
      }

      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(message));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}/mcp`,
    requests,
    sessionIdsSeen,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
