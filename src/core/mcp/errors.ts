/**
 * A JSON-RPC-level failure (unknown method, invalid params, unknown tool) — a client
 * or protocol bug, never the model's to see or retry. Distinct from `tools/call`
 * returning `isError: true`, which means the tool ran but failed and should reach
 * the model like any other step failure (see McpCallToolResult in types.ts).
 */
export class McpProtocolError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "McpProtocolError";
  }
}

/** The HTTP layer itself failed (non-2xx, network error, malformed body) — before any JSON-RPC message was parsed. */
export class McpTransportError extends Error {
  constructor(
    message: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "McpTransportError";
  }
}
