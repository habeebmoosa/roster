import type { Tool } from "ai";
import { McpClient, resolveConnectionHeaders, wrapMcpToolsForAgent } from "@/core/mcp";
import { listEnabledMcpServerIds } from "@/server/db/repositories/agent-mcp-server.repository";
import {
  getMcpConnectionWithSecret,
  updateMcpConnectionCredentials,
} from "@/server/db/repositories/mcp-connection.repository";
import { getMcpServer } from "@/server/db/repositories/mcp-server.repository";
import { decryptConnectionCredentials, encryptConnectionCredentials } from "./vault";

/**
 * Resolves live MCP tools for one agent turn: for each server the user has both
 * connected and enabled for this agent, refresh credentials if needed (persisting
 * any refresh), connect, and list its tools. A server that's unreachable or whose
 * connection is broken is skipped rather than failing the whole turn — one bad
 * connector shouldn't take down an otherwise-working conversation (same
 * degrade-gracefully posture as tryRetrieveGroundingContext in agents/service.ts).
 */
export async function resolveMcpToolsForAgent(
  userId: string,
  agentId: string,
): Promise<Record<string, Tool>> {
  const serverIds = await listEnabledMcpServerIds(userId, agentId);
  if (serverIds.length === 0) return {};

  const bindings = (
    await Promise.all(
      serverIds.map(async (serverId) => {
        try {
          const [server, connection] = await Promise.all([
            getMcpServer(serverId),
            getMcpConnectionWithSecret(userId, serverId),
          ]);
          if (!server || !connection || connection.status !== "active") return null;

          const credentials = decryptConnectionCredentials(connection.credentials);
          const resolved = await resolveConnectionHeaders(credentials);
          if (resolved.credentials !== credentials) {
            await updateMcpConnectionCredentials(
              userId,
              serverId,
              encryptConnectionCredentials(resolved.credentials),
            );
          }

          const client = new McpClient(server.connectorUrl, { headers: resolved.headers });
          await client.initialize();
          const tools = await client.listTools();
          return { serverId, client, tools };
        } catch (err) {
          console.error(`MCP server "${serverId}" unavailable for this turn, skipping:`, err);
          return null;
        }
      }),
    )
  ).filter((binding) => binding !== null);

  return wrapMcpToolsForAgent(bindings);
}
