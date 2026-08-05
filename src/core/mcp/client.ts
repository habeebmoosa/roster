import { McpTransport, type McpTransportOptions } from "./transport";
import type {
  McpCallToolResult,
  McpReadResourceResult,
  McpResource,
  McpResourceContent,
  McpServerInfo,
  McpTool,
} from "./types";

/**
 * The client's own identity, sent to the server during `initialize` — distinct from
 * clientInfo the server sends back about itself.
 */
const CLIENT_INFO = { name: "roster", version: "0.1.0" };

/** The MCP protocol revision this client speaks. Not negotiated against server capabilities yet. */
const MCP_PROTOCOL_VERSION = "2025-06-18";

interface PaginatedResult {
  nextCursor?: string;
  [key: string]: unknown;
}

/**
 * A framework-agnostic MCP client covering the tools + resources surface only
 * (no prompts, sampling, or roots) — the two capabilities Roster's employees use.
 * One instance per connected server; `initialize()` must run before any other call.
 */
export class McpClient {
  private readonly transport: McpTransport;
  private initialized = false;
  // Populated from initialize()'s response — a server that never declares
  // "resources" (or "tools") has no listing endpoint to call at all. Some
  // servers don't implement an undeclared method cleanly (hang instead of a
  // quick "method not found"), so skipping the call outright avoids paying
  // the transport's full timeout on every single turn for a capability the
  // server was never going to serve.
  private capabilities: Record<string, unknown> = {};

  constructor(serverUrl: string, options?: McpTransportOptions) {
    this.transport = new McpTransport(serverUrl, options);
  }

  async initialize(): Promise<McpServerInfo> {
    const result = await this.transport.request<McpServerInfo>("initialize", {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: CLIENT_INFO,
    });
    await this.transport.notify("notifications/initialized");
    this.initialized = true;
    this.capabilities = result.capabilities ?? {};
    return result;
  }

  async listTools(): Promise<McpTool[]> {
    this.assertInitialized();
    if (!("tools" in this.capabilities)) return [];
    return this.paginate<McpTool>("tools/list", "tools");
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<McpCallToolResult> {
    this.assertInitialized();
    return this.transport.request<McpCallToolResult>("tools/call", { name, arguments: args });
  }

  async listResources(): Promise<McpResource[]> {
    this.assertInitialized();
    if (!("resources" in this.capabilities)) return [];
    return this.paginate<McpResource>("resources/list", "resources");
  }

  async readResource(uri: string): Promise<McpResourceContent[]> {
    this.assertInitialized();
    const result = await this.transport.request<McpReadResourceResult>("resources/read", { uri });
    return result.contents;
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error("McpClient: call initialize() before any other request");
    }
  }

  private async paginate<T>(method: string, itemsKey: string): Promise<T[]> {
    const items: T[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.transport.request<PaginatedResult>(
        method,
        cursor ? { cursor } : undefined,
      );
      const pageItems = page[itemsKey];
      if (Array.isArray(pageItems)) items.push(...(pageItems as T[]));
      cursor = page.nextCursor;
    } while (cursor);

    return items;
  }
}
