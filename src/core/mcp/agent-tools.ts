import { jsonSchema, tool, type Tool } from "ai";
import type { McpClient } from "./client";
import type { McpTool } from "./types";

type RawJsonSchema = Parameters<typeof jsonSchema>[0];

export interface McpServerToolBinding {
  /** The McpServer.id this client is connected to — used to namespace tool ids and avoid collisions across servers. */
  serverId: string;
  /** An already-`initialize()`d client for this server. */
  client: McpClient;
  /** This server's tools, from a prior `listTools()` call. */
  tools: McpTool[];
}

/** A namespaced tool id such that two servers can each expose a tool named e.g. "search" without colliding. */
export function mcpToolId(serverId: string, toolName: string): string {
  return `mcp_${serverId}_${toolName}`;
}

/**
 * Wraps each connected MCP server's tools into an AI SDK ToolSet. `execute` never
 * throws on `isError: true` — that's the tool having run but failed, which should
 * reach the model as a normal result it can retry or adapt to (same as any other
 * step failure in Phase 8's retry design); a genuine protocol error (unknown tool,
 * bad params) still throws, since that's a client bug the model can't work around.
 */
export function wrapMcpToolsForAgent(bindings: McpServerToolBinding[]): Record<string, Tool> {
  const result: Record<string, Tool> = {};

  for (const { serverId, client, tools } of bindings) {
    for (const mcpTool of tools) {
      result[mcpToolId(serverId, mcpTool.name)] = tool({
        description: mcpTool.description ?? `Call "${mcpTool.name}" on the "${serverId}" server.`,
        inputSchema: jsonSchema(mcpTool.inputSchema as RawJsonSchema),
        execute: async (args) => {
          const callResult = await client.callTool(mcpTool.name, args as Record<string, unknown>);
          return {
            isError: callResult.isError ?? false,
            content: callResult.content
              .map((block) => block.text ?? JSON.stringify(block))
              .join("\n"),
          };
        },
      });
    }
  }

  return result;
}
