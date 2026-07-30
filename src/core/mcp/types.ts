/** JSON-RPC 2.0 envelope types — the wire format every MCP message rides on. */

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcSuccessResponse<T = unknown> {
  jsonrpc: "2.0";
  id: string | number | null;
  result: T;
}

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  error: JsonRpcErrorObject;
}

export type JsonRpcResponse<T = unknown> = JsonRpcSuccessResponse<T> | JsonRpcErrorResponse;

export function isJsonRpcErrorResponse(
  response: JsonRpcResponse,
): response is JsonRpcErrorResponse {
  return "error" in response;
}

/** MCP protocol types — the subset this client speaks: tools + resources, not prompts/sampling/roots. */

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface McpToolListResult {
  tools: McpTool[];
  nextCursor?: string;
}

export interface McpContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/**
 * The result of `tools/call`. `isError: true` means the tool ran but failed —
 * a spec-level distinction from a JSON-RPC protocol error (thrown as McpProtocolError):
 * this result still deserves to reach the model as a retryable step failure.
 */
export interface McpCallToolResult {
  content: McpContentBlock[];
  isError?: boolean;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpResourceListResult {
  resources: McpResource[];
  nextCursor?: string;
}

export interface McpResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  /** Base64-encoded binary contents, mutually exclusive with `text`. */
  blob?: string;
}

export interface McpReadResourceResult {
  contents: McpResourceContent[];
}

export interface McpServerInfo {
  protocolVersion: string;
  serverInfo: { name: string; version: string };
  capabilities: Record<string, unknown>;
  instructions?: string;
}
