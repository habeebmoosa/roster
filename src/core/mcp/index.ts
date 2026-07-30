export { McpClient } from "./client";
export { McpTransport, type McpTransportOptions } from "./transport";
export {
  McpProtocolError,
  McpTransportError,
  McpAuthError,
  type McpAuthErrorStage,
} from "./errors";
export * as mcpOAuth from "./oauth";
export {
  buildConnectionHeaders,
  callWithOAuthRetry,
  ensureFreshOAuthCredentials,
  isNearExpiry,
  refreshOAuthCredentials,
  resolveConnectionHeaders,
  validateStaticHeaders,
  type McpConnectionCredentials,
  type NoneCredentials,
  type OAuthCredentials,
  type StaticHeadersCredentials,
} from "./connection";
export {
  mcpServerDefinitionSchema,
  parseMcpServerDefinition,
  type McpServerDefinition,
} from "./directory";
// Note: directory-loader.ts (node fs) is intentionally NOT re-exported here — import
// it directly from "@/core/mcp/directory-loader" in server/seed code only.
export { mcpToolId, wrapMcpToolsForAgent, type McpServerToolBinding } from "./agent-tools";
export type {
  JsonRpcErrorObject,
  JsonRpcErrorResponse,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccessResponse,
  McpCallToolResult,
  McpContentBlock,
  McpReadResourceResult,
  McpResource,
  McpResourceContent,
  McpResourceListResult,
  McpServerInfo,
  McpTool,
  McpToolListResult,
} from "./types";
