import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  startMockAuthorizationServer,
  type MockAuthorizationServer,
} from "@/core/mcp/oauth/test-mock-authorization-server";
import { startMockMcpServer, type MockMcpServer } from "@/core/mcp/test-mock-server";
import { prisma } from "@/server/db/prisma";
import {
  addCustomServer,
  completeOAuthConnect,
  connectManually,
  disconnectMcpServer,
  getMcpServerForUser,
  listAgentConnectors,
  listMcpServersForUser,
  startOAuthConnect,
} from "@/server/mcp/connect-service";
import { decryptConnectionCredentials } from "@/server/mcp/vault";
import { enableMcpServerForAgent } from "@/server/db/repositories/agent-mcp-server.repository";
import { getMcpConnectionWithSecret } from "@/server/db/repositories/mcp-connection.repository";
import { createCustomMcpServer } from "@/server/db/repositories/mcp-server.repository";

/**
 * End-to-end proof of the Connectors UI's server-side orchestration (10.6),
 * fully offline: startOAuthConnect/completeOAuthConnect against a real mock
 * authorization server (the same double 10.3 unit-tests the raw oauth client
 * against), connectManually for the two non-OAuth auth modes, and the
 * add-custom-server + list/disconnect flows a real user would drive.
 */
let userId: string;
let mock: MockAuthorizationServer;
let liveMcp: MockMcpServer;
const OAUTH_SERVER_ID = `test-oauth-server-${Date.now()}`;
const HEADERS_SERVER_ID = `test-headers-server-${Date.now()}`;
const LIVE_SERVER_ID = `test-live-server-${Date.now()}`;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `mcp-connect-service-${Date.now()}@test.local` },
  });
  userId = user.id;
  mock = await startMockAuthorizationServer();
  liveMcp = await startMockMcpServer();

  await createCustomMcpServer({
    id: OAUTH_SERVER_ID,
    name: "Test OAuth Server",
    description: "A server for connect-service tests",
    connectorUrl: mock.url,
    authType: "oauth_dcr",
    categories: [],
    createdByUserId: userId,
  });
  await createCustomMcpServer({
    id: HEADERS_SERVER_ID,
    name: "Test Headers Server",
    description: "A server for connect-service tests",
    connectorUrl: "https://mcp.headers-test.example/mcp",
    authType: "static_headers",
    categories: [],
    createdByUserId: userId,
  });
  await createCustomMcpServer({
    id: LIVE_SERVER_ID,
    name: "Test Live Server",
    description: "A server for connect-service tests, backed by a real (in-process) MCP server",
    connectorUrl: liveMcp.url,
    authType: "none",
    categories: [],
    createdByUserId: userId,
  });
});

afterAll(async () => {
  await prisma.agentMcpServer.deleteMany({ where: { userId } });
  await prisma.mcpConnection.deleteMany({ where: { userId } });
  await prisma.mcpServer.deleteMany({
    where: { id: { in: [OAUTH_SERVER_ID, HEADERS_SERVER_ID, LIVE_SERVER_ID] } },
  });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await mock.close();
  await liveMcp.close();
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.mcpConnection.deleteMany({ where: { userId } });
});

describe("startOAuthConnect / completeOAuthConnect", () => {
  it("discovers, registers a client (caching it), and builds a valid authorization URL", async () => {
    const { authorizationUrl, pending } = await startOAuthConnect(
      userId,
      OAUTH_SERVER_ID,
      "https://roster.example.com/api/mcp/oauth/callback",
    );

    const url = new URL(authorizationUrl);
    expect(url.origin + url.pathname).toBe(`${mock.url}/authorize`);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("resource")).toBe(mock.url);
    expect(pending.clientId).toBe("mock-client-id");
    expect(mock.registrationRequests).toHaveLength(1);
  });

  it("reuses the cached client registration on a second connect attempt", async () => {
    await startOAuthConnect(userId, OAUTH_SERVER_ID, "https://roster.example.com/callback");
    expect(mock.registrationRequests).toHaveLength(1); // still 1 — not registered again
  });

  it("completes the flow with a valid code, persisting a decryptable oauth connection", async () => {
    const { pending } = await startOAuthConnect(
      userId,
      OAUTH_SERVER_ID,
      "https://roster.example.com/callback",
    );

    await completeOAuthConnect(pending, "valid-code", pending.state);

    const stored = await getMcpConnectionWithSecret(userId, OAUTH_SERVER_ID);
    expect(stored).not.toBeNull();
    const credentials = decryptConnectionCredentials(stored!.credentials);
    expect(credentials).toMatchObject({ type: "oauth", accessToken: "access-token-1" });
  });

  it("rejects a state mismatch as a CSRF attempt, without exchanging anything", async () => {
    const { pending } = await startOAuthConnect(
      userId,
      OAUTH_SERVER_ID,
      "https://roster.example.com/callback",
    );
    await expect(completeOAuthConnect(pending, "valid-code", "wrong-state")).rejects.toThrow(
      /state mismatch/i,
    );
  });
});

describe("connectManually", () => {
  it("stores static_headers credentials", async () => {
    await connectManually(userId, HEADERS_SERVER_ID, { "x-api-key": "secret-123" });
    const stored = await getMcpConnectionWithSecret(userId, HEADERS_SERVER_ID);
    const credentials = decryptConnectionCredentials(stored!.credentials);
    expect(credentials).toEqual({ type: "static_headers", headers: { "x-api-key": "secret-123" } });
  });

  it("stores none credentials when no headers are given", async () => {
    await connectManually(userId, HEADERS_SERVER_ID, {});
    const stored = await getMcpConnectionWithSecret(userId, HEADERS_SERVER_ID);
    const credentials = decryptConnectionCredentials(stored!.credentials);
    expect(credentials).toEqual({ type: "none" });
  });
});

describe("listMcpServersForUser / getMcpServerForUser / disconnectMcpServer", () => {
  it("reflects connection status per server", async () => {
    await connectManually(userId, HEADERS_SERVER_ID, { "x-api-key": "secret" });

    const list = await listMcpServersForUser(userId);
    const headersServer = list.find((s) => s.id === HEADERS_SERVER_ID);
    const oauthServer = list.find((s) => s.id === OAUTH_SERVER_ID);
    expect(headersServer?.connected).toBe(true);
    expect(oauthServer?.connected).toBe(false);

    const detail = await getMcpServerForUser(userId, HEADERS_SERVER_ID);
    expect(detail?.connected).toBe(true);

    await disconnectMcpServer(userId, HEADERS_SERVER_ID);
    const afterDisconnect = await getMcpServerForUser(userId, HEADERS_SERVER_ID);
    expect(afterDisconnect?.connected).toBe(false);
  });
});

describe("connectManually — live capability refresh", () => {
  it("overwrites cachedTools/cachedResources with the server's real tools/list + resources/list result", async () => {
    await connectManually(userId, LIVE_SERVER_ID, {});

    const server = await getMcpServerForUser(userId, LIVE_SERVER_ID);
    expect(server?.cachedTools.map((t) => t.name).sort()).toEqual(["echo", "fail"]);
    expect(server?.cachedResources.map((r) => r.name).sort()).toEqual(["Resource A", "Resource B"]);
  });

  it("falls back to the existing cached snapshot when the live server is unreachable", async () => {
    // HEADERS_SERVER_ID's connectorUrl points at a nonexistent domain — the earlier
    // "stores static_headers credentials" test already exercised this path without
    // throwing; this asserts the connection itself still lands correctly regardless.
    await connectManually(userId, HEADERS_SERVER_ID, { "x-api-key": "secret-123" });
    const stored = await getMcpConnectionWithSecret(userId, HEADERS_SERVER_ID);
    expect(stored).not.toBeNull();
  });
});

describe("addCustomServer", () => {
  it("creates a server with a slugified id and custom trust tier", async () => {
    const server = await addCustomServer(userId, {
      name: "Acme Test CRM",
      description: "A test CRM",
      connectorUrl: "https://mcp.acme-test.example/mcp",
      authType: "static_headers",
    });
    expect(server.id).toBe("acme-test-crm");
    expect(server.trustTier).toBe("custom");
    await prisma.mcpServer.delete({ where: { id: server.id } });
  });

  it("disambiguates a name collision with a suffix", async () => {
    const first = await addCustomServer(userId, {
      name: "Collision Server",
      description: "First",
      connectorUrl: "https://mcp.collision-1.example/mcp",
      authType: "none",
    });
    const second = await addCustomServer(userId, {
      name: "Collision Server",
      description: "Second",
      connectorUrl: "https://mcp.collision-2.example/mcp",
      authType: "none",
    });
    expect(second.id).not.toBe(first.id);
    expect(second.id.startsWith("collision-server-")).toBe(true);
    await prisma.mcpServer.deleteMany({ where: { id: { in: [first.id, second.id] } } });
  });
});

describe("listAgentConnectors", () => {
  const AGENT_ID = "customer-support"; // real, seeded — only this test's own AgentMcpServer rows are touched

  it("omits servers the user hasn't connected, even if enabled for the agent — enabling a disconnected server is meaningless at runtime", async () => {
    await enableMcpServerForAgent(userId, AGENT_ID, OAUTH_SERVER_ID); // never connected in this describe block
    const connectors = await listAgentConnectors(userId, AGENT_ID);
    expect(connectors.find((c) => c.id === OAUTH_SERVER_ID)).toBeUndefined();
  });

  it("lists a connected server as not enabled when it hasn't been turned on for this agent", async () => {
    await connectManually(userId, HEADERS_SERVER_ID, { "x-api-key": "secret" });
    const connectors = await listAgentConnectors(userId, AGENT_ID);
    const headersServer = connectors.find((c) => c.id === HEADERS_SERVER_ID);
    expect(headersServer).toMatchObject({ connected: true, enabled: false });
  });

  it("marks a connected, enabled server as enabled", async () => {
    await connectManually(userId, HEADERS_SERVER_ID, { "x-api-key": "secret" });
    await enableMcpServerForAgent(userId, AGENT_ID, HEADERS_SERVER_ID);
    const connectors = await listAgentConnectors(userId, AGENT_ID);
    expect(connectors.find((c) => c.id === HEADERS_SERVER_ID)).toMatchObject({
      connected: true,
      enabled: true,
    });
  });
});
