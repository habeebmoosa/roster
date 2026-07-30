/** A tool/resource name+description pair — mirrors CachedCapability from mcp-server.repository.ts. */
export interface ConnectorCapability {
  name: string;
  description: string;
}

/** The Connectors UI's view of an McpServerListItem (server/mcp/connect-service.ts) — real data, backed by the McpServer/McpConnection tables (Phase 10.5). */
export interface Connector {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  developer: string | null;
  connectorUrl: string;
  authType: "oauth_dcr" | "static_headers" | "none" | string;
  categories: string[];
  trustTier: "verified" | "community" | "custom" | string;
  cachedTools: ConnectorCapability[];
  cachedResources: ConnectorCapability[];
  documentationUrl: string | null;
  supportUrl: string | null;
  privacyPolicyUrl: string | null;
  connected: boolean;
  connectionStatus: string | null;
}
