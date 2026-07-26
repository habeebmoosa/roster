import { afterEach, describe, expect, it } from "vitest";
import { buildAuthorizationUrl, exchangeCodeForToken, refreshAccessToken } from "./flow";
import { McpAuthError } from "../errors";
import {
  startMockAuthorizationServer,
  type MockAuthorizationServer,
} from "./test-mock-authorization-server";

describe("buildAuthorizationUrl", () => {
  it("includes PKCE, state, and the RFC 8707 resource parameter", () => {
    const url = new URL(
      buildAuthorizationUrl({
        authorizationEndpoint: "https://auth.example.com/authorize",
        clientId: "client-1",
        redirectUri: "https://roster.example.com/callback",
        codeChallenge: "challenge-abc",
        state: "state-xyz",
        resource: "https://mcp.example.com",
      }),
    );

    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("client-1");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-abc");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe("state-xyz");
    expect(url.searchParams.get("resource")).toBe("https://mcp.example.com");
  });
});

describe("exchangeCodeForToken / refreshAccessToken (mock authorization server)", () => {
  let mock: MockAuthorizationServer;

  afterEach(async () => {
    await mock.close();
  });

  it("exchanges a valid code for tokens, sending the resource and code_verifier", async () => {
    mock = await startMockAuthorizationServer();

    const tokens = await exchangeCodeForToken({
      tokenEndpoint: `${mock.url}/token`,
      clientId: "mock-client-id",
      code: "valid-code",
      redirectUri: "https://roster.example.com/callback",
      codeVerifier: "some-verifier",
      resource: mock.url,
    });

    expect(tokens.access_token).toBe("access-token-1");
    expect(tokens.refresh_token).toBe("refresh-1");
    expect(mock.tokenRequests[0]).toMatchObject({
      grant_type: "authorization_code",
      resource: mock.url,
      code_verifier: "some-verifier",
    });
  });

  it("throws McpAuthError for an invalid code", async () => {
    mock = await startMockAuthorizationServer();

    await expect(
      exchangeCodeForToken({
        tokenEndpoint: `${mock.url}/token`,
        clientId: "mock-client-id",
        code: "wrong-code",
        redirectUri: "https://roster.example.com/callback",
        codeVerifier: "some-verifier",
        resource: mock.url,
      }),
    ).rejects.toThrow(McpAuthError);
  });

  it("refreshes an access token and surfaces the rotated refresh token", async () => {
    mock = await startMockAuthorizationServer();

    const refreshed = await refreshAccessToken({
      tokenEndpoint: `${mock.url}/token`,
      clientId: "mock-client-id",
      refreshToken: "refresh-1",
      resource: mock.url,
    });

    expect(refreshed.access_token).toBe("access-token-2");
    expect(refreshed.refresh_token).toBe("refresh-2");
    expect(refreshed.refresh_token).not.toBe("refresh-1");
  });

  it("throws McpAuthError when refreshing with a stale/already-rotated refresh token", async () => {
    mock = await startMockAuthorizationServer();

    await expect(
      refreshAccessToken({
        tokenEndpoint: `${mock.url}/token`,
        clientId: "mock-client-id",
        refreshToken: "refresh-2",
        resource: mock.url,
      }),
    ).rejects.toThrow(McpAuthError);
  });
});
