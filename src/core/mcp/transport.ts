import { McpProtocolError, McpTransportError } from "./errors";
import { isJsonRpcErrorResponse, type JsonRpcRequest, type JsonRpcResponse } from "./types";

/**
 * A server that never responds (or whose connection quietly stalls) would
 * otherwise hang for however long the OS/undici socket takes to notice —
 * observed in the wild taking over 60s before erroring, blocking the
 * connect flow the whole time. Bounding every request keeps a single bad
 * server from making "Connect" (or a chat turn's tool refresh) feel frozen.
 */
const DEFAULT_TIMEOUT_MS = 15_000;

export interface McpTransportOptions {
  /** Extra headers sent on every request — e.g. an Authorization bearer token (wired in 10.3/10.4). */
  headers?: Record<string, string>;
  /** Per-request abort timeout in ms. Defaults to DEFAULT_TIMEOUT_MS. */
  timeoutMs?: number;
}

/**
 * Speaks MCP's Streamable HTTP transport: a single POST endpoint that replies either as
 * one JSON object or as a Server-Sent-Events stream carrying one JSON-RPC message, plus
 * the `Mcp-Session-Id` header the server assigns on `initialize` and expects echoed back
 * on every later request.
 */
export class McpTransport {
  private sessionId: string | undefined;
  private nextRequestId = 1;

  constructor(
    private readonly serverUrl: string,
    private readonly options: McpTransportOptions = {},
  ) {}

  /** Sends a JSON-RPC request and returns its unwrapped `result`. Throws McpProtocolError for a JSON-RPC-level `error`. */
  async request<T>(method: string, params?: unknown): Promise<T> {
    const id = this.nextRequestId++;
    const response = await this.post({ jsonrpc: "2.0", id, method, params });
    const message = await this.parseResponseBody<T>(response);
    return unwrapJsonRpcResult(message);
  }

  /** Fire-and-forget JSON-RPC notification (no id, no response body expected) — e.g. `notifications/initialized`. */
  async notify(method: string, params?: unknown): Promise<void> {
    const response = await this.post({ jsonrpc: "2.0", method, params });
    await response.body?.cancel().catch(() => {});
  }

  private async post(body: JsonRpcRequest | Omit<JsonRpcRequest, "id">): Promise<Response> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...this.options.headers,
    };
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;

    let response: Response;
    try {
      response = await fetch(this.serverUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
    } catch (err) {
      throw new McpTransportError(
        err instanceof Error && err.name === "TimeoutError"
          ? `MCP server didn't respond within ${this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`
          : `MCP server request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const returnedSessionId = response.headers.get("mcp-session-id");
    if (returnedSessionId) this.sessionId = returnedSessionId;

    if (!response.ok) {
      throw new McpTransportError(
        `MCP server responded with HTTP ${response.status}`,
        response.status,
        response.headers.get("www-authenticate") ?? undefined,
      );
    }
    return response;
  }

  private async parseResponseBody<T>(response: Response): Promise<JsonRpcResponse<T>> {
    if (response.status === 202 || response.headers.get("content-length") === "0") {
      throw new McpTransportError("Expected a JSON-RPC response but the server returned no body");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return collectSseJsonRpcMessage<T>(response);
    }
    return (await response.json()) as JsonRpcResponse<T>;
  }
}

function unwrapJsonRpcResult<T>(message: JsonRpcResponse<T>): T {
  if (isJsonRpcErrorResponse(message)) {
    throw new McpProtocolError(message.error.code, message.error.message, message.error.data);
  }
  return message.result;
}

/**
 * Reads an SSE stream and returns the first complete event's JSON-RPC payload —
 * sufficient for MVP request/response semantics, where the server sends exactly
 * one message in reply before closing the stream.
 */
async function collectSseJsonRpcMessage<T>(response: Response): Promise<JsonRpcResponse<T>> {
  const reader = response.body?.getReader();
  if (!reader) throw new McpTransportError("SSE response had no readable body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        const dataLines = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart());

        if (dataLines.length > 0) {
          return JSON.parse(dataLines.join("\n")) as JsonRpcResponse<T>;
        }
        separatorIndex = buffer.indexOf("\n\n");
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  throw new McpTransportError("SSE stream ended without a JSON-RPC response");
}
