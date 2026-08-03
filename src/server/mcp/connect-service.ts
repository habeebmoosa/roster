import { randomUUID } from "node:crypto";
import {
  buildConnectionHeaders,
  mcpOAuth,
  McpClient,
  validateStaticHeaders,
  type McpConnectionCredentials,
  type OAuthCredentials,
} from "@/core/mcp";
import { slugify } from "@/lib/slugify";
import { decryptSecret, encryptSecret } from "@/server/crypto/vault";
import { listEnabledMcpServerIds } from "@/server/db/repositories/agent-mcp-server.repository";
import {
  deleteMcpConnection,
  listMcpConnections,
  upsertMcpConnection,
} from "@/server/db/repositories/mcp-connection.repository";
import {
  createCustomMcpServer,
  getMcpServer,
  getRegisteredOAuthClient,
  listMcpServers,
  saveRegisteredOAuthClient,
  updateMcpServerCapabilities,
  type CachedCapability,
  type McpServerRecord,
} from "@/server/db/repositories/mcp-server.repository";
import { listResourcesOrEmpty } from "./agent-tools-service";
import type { PendingOAuthConnect } from "./oauth-pending-cookie";
import { encryptConnectionCredentials } from "./vault";

function toCachedCapabilities(items: { name: string; description?: string }[]): CachedCapability[] {
  return items.map((item) => ({ name: item.name, description: item.description ?? "" }));
}

/**
 * Best-effort live refresh of a server's tool/resource snapshot right after a
 * successful connect. The directory entry's `tools`/`resources` are a
 * hand-curated, representative preview (mcp-servers/README.md) shown before
 * anyone has connected — the real list is whatever the server itself reports
 * via `tools/list`/`resources/list`. Never throws: any failure here (server
 * down, auth hiccup, protocol error) just means the existing cached/curated
 * snapshot keeps serving as the fallback the Connectors UI already renders.
 */
async function refreshServerCapabilities(
  serverId: string,
  connectorUrl: string,
  headers: Record<string, string>,
): Promise<void> {
  try {
    const client = new McpClient(connectorUrl, { headers });
    await client.initialize();
    const [tools, resources] = await Promise.all([
      client.listTools(),
      listResourcesOrEmpty(client, serverId),
    ]);
    await updateMcpServerCapabilities(
      serverId,
      toCachedCapabilities(tools),
      toCachedCapabilities(resources),
    );
  } catch (err) {
    console.error(
      `Couldn't refresh live capabilities for "${serverId}", keeping the cached snapshot:`,
      err,
    );
  }
}

export interface McpServerListItem extends McpServerRecord {
  connected: boolean;
  connectionStatus: string | null;
}

export async function listMcpServersForUser(userId: string): Promise<McpServerListItem[]> {
  const [servers, connections] = await Promise.all([listMcpServers(), listMcpConnections(userId)]);
  const statusByServerId = new Map(connections.map((c) => [c.mcpServerId, c.status]));
  return servers.map((server) => ({
    ...server,
    connected: statusByServerId.has(server.id),
    connectionStatus: statusByServerId.get(server.id) ?? null,
  }));
}

export async function getMcpServerForUser(
  userId: string,
  serverId: string,
): Promise<McpServerListItem | null> {
  const server = await getMcpServer(serverId);
  if (!server) return null;
  const connections = await listMcpConnections(userId);
  const match = connections.find((c) => c.mcpServerId === serverId);
  return { ...server, connected: Boolean(match), connectionStatus: match?.status ?? null };
}

export interface AgentConnectorOption extends McpServerListItem {
  /** Whether this agent has this server turned on (AgentMcpServer) — only meaningful alongside `connected: true`; an unconnected server can't usefully be enabled. */
  enabled: boolean;
}

/**
 * The user's connected MCP servers, each annotated with whether they're
 * enabled for this specific agent — the single source both the hire wizard's
 * Connectors step and the worker detail page's Connectors tab read from.
 * Servers the user hasn't connected are omitted entirely: enabling one would
 * do nothing at runtime anyway (resolveMcpToolsForAgent requires an active
 * connection too), so there's nothing useful to toggle for it here.
 */
export async function listAgentConnectors(
  userId: string,
  agentId: string,
): Promise<AgentConnectorOption[]> {
  const [servers, enabledIds] = await Promise.all([
    listMcpServersForUser(userId),
    listEnabledMcpServerIds(userId, agentId),
  ]);
  const enabledSet = new Set(enabledIds);
  return servers
    .filter((server) => server.connected)
    .map((server) => ({ ...server, enabled: enabledSet.has(server.id) }));
}

/** Connects a "static_headers" server with the given headers, or a "none" server with an empty map — the two non-OAuth auth modes. */
export async function connectManually(
  userId: string,
  serverId: string,
  headers: Record<string, string>,
): Promise<void> {
  let credentials: McpConnectionCredentials;
  if (Object.keys(headers).length === 0) {
    credentials = { type: "none" };
  } else {
    validateStaticHeaders(headers);
    credentials = { type: "static_headers", headers };
  }
  await upsertMcpConnection({
    userId,
    mcpServerId: serverId,
    credentials: encryptConnectionCredentials(credentials),
  });

  const server = await getMcpServer(serverId);
  if (server) {
    await refreshServerCapabilities(serverId, server.connectorUrl, buildConnectionHeaders(credentials));
  }
}

export async function disconnectMcpServer(userId: string, serverId: string): Promise<void> {
  await deleteMcpConnection(userId, serverId);
}

/**
 * Resolves discovery + a client registration (reusing one cached on the server row from a
 * prior connect by any user, since a DCR client is shared across Roster's whole user base —
 * only the resulting tokens are per-user) and builds the redirect URL. Returns the pending
 * state for the caller (the API route) to stash in a cookie before issuing the redirect.
 */
export async function startOAuthConnect(
  userId: string,
  serverId: string,
  redirectUri: string,
): Promise<{ authorizationUrl: string; pending: PendingOAuthConnect }> {
  const server = await getMcpServer(serverId);
  if (!server) throw new Error(`Unknown MCP server "${serverId}"`);

  const resourceMetadataUrl = mcpOAuth.resolveProtectedResourceMetadataUrl(server.connectorUrl);
  const resourceMetadata = await mcpOAuth.fetchProtectedResourceMetadata(resourceMetadataUrl);
  const issuer = resourceMetadata.authorization_servers[0];
  if (!issuer) {
    throw new Error(`"${serverId}" published no authorization servers in its resource metadata`);
  }
  const authServerMetadata = await mcpOAuth.fetchAuthorizationServerMetadata(issuer);

  let clientId: string;
  let clientSecret: string | undefined;
  const registered = await getRegisteredOAuthClient(serverId);
  if (registered) {
    clientId = registered.clientId;
    clientSecret = registered.encryptedClientSecret
      ? decryptSecret(registered.encryptedClientSecret)
      : undefined;
  } else {
    if (!authServerMetadata.registration_endpoint) {
      throw new Error(`"${serverId}"'s authorization server has no registration_endpoint (DCR)`);
    }
    const registration = await mcpOAuth.registerClient(authServerMetadata.registration_endpoint, {
      redirect_uris: [redirectUri],
      client_name: "Roster",
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    });
    clientId = registration.client_id;
    clientSecret = registration.client_secret;
    await saveRegisteredOAuthClient(
      serverId,
      clientId,
      clientSecret ? encryptSecret(clientSecret) : null,
    );
  }

  const { codeVerifier, codeChallenge } = mcpOAuth.generatePkcePair();
  const state = mcpOAuth.generateState();

  const authorizationUrl = mcpOAuth.buildAuthorizationUrl({
    authorizationEndpoint: authServerMetadata.authorization_endpoint,
    clientId,
    redirectUri,
    codeChallenge,
    state,
    resource: resourceMetadata.resource,
  });

  const pending: PendingOAuthConnect = {
    userId,
    serverId,
    state,
    codeVerifier,
    resource: resourceMetadata.resource,
    tokenEndpoint: authServerMetadata.token_endpoint,
    clientId,
    clientSecret,
    redirectUri,
  };

  return { authorizationUrl, pending };
}

/** Verifies `state` (CSRF check) and exchanges the code for tokens, persisting the connection. */
export async function completeOAuthConnect(
  pending: PendingOAuthConnect,
  code: string,
  returnedState: string,
): Promise<void> {
  if (returnedState !== pending.state) {
    throw new Error("OAuth state mismatch — possible CSRF, aborting");
  }

  const tokenResponse = await mcpOAuth.exchangeCodeForToken({
    tokenEndpoint: pending.tokenEndpoint,
    clientId: pending.clientId,
    clientSecret: pending.clientSecret,
    code,
    redirectUri: pending.redirectUri,
    codeVerifier: pending.codeVerifier,
    resource: pending.resource,
  });

  const credentials: OAuthCredentials = {
    type: "oauth",
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresAt:
      tokenResponse.expires_in !== undefined
        ? Date.now() + tokenResponse.expires_in * 1000
        : undefined,
    tokenEndpoint: pending.tokenEndpoint,
    clientId: pending.clientId,
    clientSecret: pending.clientSecret,
    resource: pending.resource,
  };

  await upsertMcpConnection({
    userId: pending.userId,
    mcpServerId: pending.serverId,
    credentials: encryptConnectionCredentials(credentials),
  });

  const server = await getMcpServer(pending.serverId);
  if (server) {
    await refreshServerCapabilities(
      pending.serverId,
      server.connectorUrl,
      buildConnectionHeaders(credentials),
    );
  }
}

export interface AddCustomServerInput {
  name: string;
  description: string;
  connectorUrl: string;
  authType: "oauth_dcr" | "static_headers" | "none";
  categories?: string[];
}

/** Adds a user's own custom MCP server to the directory, visible to (and connectable by) every user, same as a curated entry — just trustTier "custom". */
export async function addCustomServer(
  userId: string,
  input: AddCustomServerInput,
): Promise<McpServerRecord> {
  const base = slugify(input.name) || "custom-server";
  let id = base;
  if (await getMcpServer(id)) {
    id = `${base}-${randomUUID().slice(0, 8)}`;
  }

  return createCustomMcpServer({
    id,
    name: input.name,
    description: input.description,
    connectorUrl: input.connectorUrl,
    authType: input.authType,
    categories: input.categories ?? [],
    createdByUserId: userId,
  });
}
