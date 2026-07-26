import { afterEach, describe, expect, it } from "vitest";
import {
  fetchAuthorizationServerMetadata,
  fetchProtectedResourceMetadata,
  resolveProtectedResourceMetadataUrl,
} from "./discovery";
import { McpAuthError } from "../errors";
import {
  startMockAuthorizationServer,
  type MockAuthorizationServer,
} from "./test-mock-authorization-server";

describe("resolveProtectedResourceMetadataUrl", () => {
  it("uses the resource_metadata param from WWW-Authenticate when present", () => {
    const url = resolveProtectedResourceMetadataUrl(
      "https://mcp.example.com/sse",
      'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource/sse"',
    );
    expect(url).toBe("https://mcp.example.com/.well-known/oauth-protected-resource/sse");
  });

  it("falls back to the default well-known location, inserting the segment before any path", () => {
    expect(resolveProtectedResourceMetadataUrl("https://mcp.example.com/sse", null)).toBe(
      "https://mcp.example.com/.well-known/oauth-protected-resource/sse",
    );
    expect(resolveProtectedResourceMetadataUrl("https://mcp.example.com", null)).toBe(
      "https://mcp.example.com/.well-known/oauth-protected-resource",
    );
  });
});

describe("fetchProtectedResourceMetadata / fetchAuthorizationServerMetadata (mock server)", () => {
  let mock: MockAuthorizationServer;

  afterEach(async () => {
    await mock.close();
  });

  it("fetches protected resource metadata pointing at the authorization server", async () => {
    mock = await startMockAuthorizationServer();
    const metadata = await fetchProtectedResourceMetadata(
      `${mock.url}/.well-known/oauth-protected-resource`,
    );
    expect(metadata.authorization_servers).toEqual([mock.url]);
  });

  it("discovers authorization server metadata via RFC 8414", async () => {
    mock = await startMockAuthorizationServer();
    const metadata = await fetchAuthorizationServerMetadata(mock.url);
    expect(metadata.token_endpoint).toBe(`${mock.url}/token`);
    expect(metadata.registration_endpoint).toBe(`${mock.url}/register`);
    expect(metadata.code_challenge_methods_supported).toContain("S256");
  });

  it("throws McpAuthError when protected resource metadata can't be reached", async () => {
    mock = await startMockAuthorizationServer();
    await expect(
      fetchProtectedResourceMetadata(`${mock.url}/.well-known/does-not-exist`),
    ).rejects.toThrow(McpAuthError);
  });

  it("throws McpAuthError when no authorization server metadata is discoverable", async () => {
    // Nothing is listening on this port, so both the 8414 and OIDC candidate fetches fail outright.
    await expect(fetchAuthorizationServerMetadata("http://127.0.0.1:1")).rejects.toThrow(
      McpAuthError,
    );
  });
});
