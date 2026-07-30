import { describe, expect, it } from "vitest";
import { decryptConnectionCredentials, encryptConnectionCredentials } from "@/server/mcp/vault";
import type { McpConnectionCredentials } from "@/core/mcp/connection";

/**
 * Round-trips both connection auth modes through the real server-side vault
 * (AES-256-GCM, keyed by the real ENCRYPTION_KEY from .env) — the same primitive
 * BYOK provider keys already use (Phase 3). Integration-level because it depends
 * on @/lib/env's full schema, like server/providers/service.ts already does.
 */
describe("MCP connection vault", () => {
  it("round-trips static_headers credentials", () => {
    const credentials: McpConnectionCredentials = {
      type: "static_headers",
      headers: { "x-api-key": "sk-live-abc123" },
    };
    const payload = encryptConnectionCredentials(credentials);
    expect(payload).not.toContain("sk-live-abc123");
    expect(decryptConnectionCredentials(payload)).toEqual(credentials);
  });

  it("round-trips oauth credentials", () => {
    const credentials: McpConnectionCredentials = {
      type: "oauth",
      accessToken: "at-1",
      refreshToken: "rt-1",
      expiresAt: 1_800_000_000_000,
      tokenEndpoint: "https://auth.example.com/token",
      clientId: "client-1",
      clientSecret: "client-secret-1",
      resource: "https://mcp.example.com",
    };
    const payload = encryptConnectionCredentials(credentials);
    expect(payload).not.toContain("at-1");
    expect(payload).not.toContain("client-secret-1");
    expect(decryptConnectionCredentials(payload)).toEqual(credentials);
  });

  it("round-trips none credentials", () => {
    const credentials: McpConnectionCredentials = { type: "none" };
    expect(decryptConnectionCredentials(encryptConnectionCredentials(credentials))).toEqual(
      credentials,
    );
  });

  it("produces a different ciphertext for the same credentials each time (random IV)", () => {
    const credentials: McpConnectionCredentials = { type: "static_headers", headers: { a: "b" } };
    expect(encryptConnectionCredentials(credentials)).not.toBe(
      encryptConnectionCredentials(credentials),
    );
  });
});
