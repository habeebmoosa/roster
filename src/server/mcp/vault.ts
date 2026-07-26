import { decryptSecret, encryptSecret } from "@/server/crypto/vault";
import type { McpConnectionCredentials } from "@/core/mcp/connection";

/**
 * Serializes MCP connection credentials — OAuth tokens or static header values — to an
 * AES-256-GCM-encrypted string using the same server-side vault BYOK keys already use
 * (Phase 3). Storage shape for `McpConnection.credentials` (10.5); no DB access here.
 */
export function encryptConnectionCredentials(credentials: McpConnectionCredentials): string {
  return encryptSecret(JSON.stringify(credentials));
}

export function decryptConnectionCredentials(payload: string): McpConnectionCredentials {
  return JSON.parse(decryptSecret(payload)) as McpConnectionCredentials;
}
