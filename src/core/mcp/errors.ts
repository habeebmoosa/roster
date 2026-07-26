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

/**
 * The HTTP layer itself failed (non-2xx, network error, malformed body) — before any
 * JSON-RPC message was parsed. Carries the `WWW-Authenticate` header verbatim when
 * present (a 401 response) so callers can kick off the OAuth discovery flow (10.3)
 * without re-requesting the resource.
 */
export class McpTransportError extends Error {
  constructor(
    message: string,
    public readonly httpStatus?: number,
    public readonly wwwAuthenticate?: string,
  ) {
    super(message);
    this.name = "McpTransportError";
  }
}

export type McpAuthErrorStage =
  | "resource_metadata_discovery"
  | "authorization_server_discovery"
  | "client_registration"
  | "token_exchange"
  | "token_refresh";

/** Any failure in the OAuth 2.1 authorization flow (discovery, registration, or a token request) — never thrown mid-way through an already-established, authenticated MCP session. */
export class McpAuthError extends Error {
  constructor(
    public readonly stage: McpAuthErrorStage,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "McpAuthError";
  }
}
