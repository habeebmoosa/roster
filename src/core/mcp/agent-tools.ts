import { jsonSchema, tool, type Tool } from "ai";
import { z } from "zod";
import type { McpClient } from "./client";
import type { McpResource, McpTool } from "./types";

type RawJsonSchema = Parameters<typeof jsonSchema>[0];

export interface McpServerToolBinding {
  /** The McpServer.id this client is connected to — used to namespace tool ids and avoid collisions across servers. */
  serverId: string;
  /** This server's display name — carried onto every tool call's `toolMetadata` so the chat UI can attribute a call to its connector without parsing the namespaced tool id back apart. */
  serverName: string;
  /** An already-`initialize()`d client for this server. */
  client: McpClient;
  /** This server's tools, from a prior `listTools()` call. */
  tools: McpTool[];
  /** This server's resources, from a prior `listResources()` call — omit or leave empty for a server with none. */
  resources?: McpResource[];
}

/**
 * Attached to every MCP tool via `tool({ metadata })`, which the AI SDK
 * propagates onto that call's `toolMetadata` on every tool-call/tool-result
 * event and UI message part — documented as "useful for sources of dynamic
 * tools (e.g. an MCP server) to identify themselves." Built-in tools carry no
 * metadata at all, so "has `toolMetadata`" is how the UI tells an MCP-sourced
 * call from a built-in one.
 */
export interface McpToolMetadata {
  source: "mcp";
  serverId: string;
  serverName: string;
  // Satisfies `tool()`'s `metadata?: JSONObject` constraint while keeping the three fields above named/typed for callers.
  [key: string]: string;
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

  for (const { serverId, serverName, client, tools, resources } of bindings) {
    const metadata: McpToolMetadata = { source: "mcp", serverId, serverName };

    for (const mcpTool of tools) {
      result[mcpToolId(serverId, mcpTool.name)] = tool({
        description: mcpTool.description ?? `Call "${mcpTool.name}" on the "${serverId}" server.`,
        inputSchema: jsonSchema(mcpTool.inputSchema as RawJsonSchema),
        metadata,
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

    if (resources && resources.length > 0) {
      result[mcpToolId(serverId, "list_resources")] = tool({
        description: `List resources available from the "${serverId}" server (files, records, or other data it exposes for reading).`,
        inputSchema: z.object({}),
        metadata,
        execute: async () =>
          resources.map((r) => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType,
          })),
      });

      result[mcpToolId(serverId, "read_resource")] = tool({
        description: `Read one resource from the "${serverId}" server by its URI — use ${mcpToolId(serverId, "list_resources")} first to see what's available. The result becomes context for continuing this task, the same way retrieved knowledge does.`,
        inputSchema: z.object({ uri: z.string().min(1) }),
        metadata,
        execute: async ({ uri }) => {
          const contents = await client.readResource(uri);
          return contents.map((c) => ({
            uri: c.uri,
            mimeType: c.mimeType,
            text: c.text,
            // Binary content isn't useful to a text-only model turn — note its presence without inlining it.
            hasBinaryContent: c.blob !== undefined,
          }));
        },
      });
    }
  }

  return result;
}
