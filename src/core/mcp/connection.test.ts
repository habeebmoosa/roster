import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildConnectionHeaders,
  callWithOAuthRetry,
  ensureFreshOAuthCredentials,
  isNearExpiry,
  refreshOAuthCredentials,
  resolveConnectionHeaders,
  validateStaticHeaders,
  type OAuthCredentials,
} from "./connection";
import { McpTransportError } from "./errors";
import {
  startMockAuthorizationServer,
  type MockAuthorizationServer,
} from "./oauth/test-mock-authorization-server";

describe("validateStaticHeaders", () => {
  it("allows arbitrary non-reserved headers", () => {
    expect(() => validateStaticHeaders({ "x-api-key": "secret" })).not.toThrow();
  });

  it.each(["content-type", "Accept", "MCP-Session-Id"])(
    "rejects the reserved header %s regardless of casing",
    (name) => {
      expect(() => validateStaticHeaders({ [name]: "whatever" })).toThrow(/reserved header/i);
    },
  );
});

describe("buildConnectionHeaders", () => {
  it("passes static headers through unchanged", () => {
    const headers = buildConnectionHeaders({
      type: "static_headers",
      headers: { "x-api-key": "secret" },
    });
    expect(headers).toEqual({ "x-api-key": "secret" });
  });

  it("builds a bearer Authorization header for oauth", () => {
    const headers = buildConnectionHeaders({
      type: "oauth",
      accessToken: "at-1",
      tokenEndpoint: "https://auth.example.com/token",
      clientId: "client-1",
      resource: "https://mcp.example.com",
    });
    expect(headers).toEqual({ authorization: "Bearer at-1" });
  });

  it("returns no headers for none", () => {
    expect(buildConnectionHeaders({ type: "none" })).toEqual({});
  });
});

describe("isNearExpiry", () => {
  const base: OAuthCredentials = {
    type: "oauth",
    accessToken: "at",
    tokenEndpoint: "https://auth.example.com/token",
    clientId: "client-1",
    resource: "https://mcp.example.com",
  };

  it("treats an undefined expiresAt as always fresh", () => {
    expect(isNearExpiry(base, 1_000_000)).toBe(false);
  });

  it("is false well before expiry", () => {
    expect(isNearExpiry({ ...base, expiresAt: 1_000_000 + 10 * 60_000 }, 1_000_000)).toBe(false);
  });

  it("is true within the refresh buffer of expiry", () => {
    expect(isNearExpiry({ ...base, expiresAt: 1_000_000 + 30_000 }, 1_000_000)).toBe(true);
  });

  it("is true once already expired", () => {
    expect(isNearExpiry({ ...base, expiresAt: 999_000 }, 1_000_000)).toBe(true);
  });
});

describe("refreshOAuthCredentials / ensureFreshOAuthCredentials (mock authorization server)", () => {
  let mock: MockAuthorizationServer;

  afterEach(async () => {
    await mock.close();
  });

  function credentialsFor(
    mockUrl: string,
    overrides: Partial<OAuthCredentials> = {},
  ): OAuthCredentials {
    return {
      type: "oauth",
      accessToken: "stale-access-token",
      refreshToken: "refresh-1",
      expiresAt: 0,
      tokenEndpoint: `${mockUrl}/token`,
      clientId: "mock-client-id",
      resource: mockUrl,
      ...overrides,
    };
  }

  it("refreshes unconditionally and applies the rotated refresh token", async () => {
    mock = await startMockAuthorizationServer();
    const credentials = credentialsFor(mock.url);

    const refreshed = await refreshOAuthCredentials(credentials, 1_000_000);

    expect(refreshed.accessToken).toBe("access-token-2");
    expect(refreshed.refreshToken).toBe("refresh-2");
    expect(refreshed.expiresAt).toBe(1_000_000 + 3600 * 1000);
  });

  it("throws when there is no refresh token to use", async () => {
    mock = await startMockAuthorizationServer();
    const credentials = credentialsFor(mock.url, { refreshToken: undefined });
    await expect(refreshOAuthCredentials(credentials)).rejects.toThrow(/no refresh token/i);
  });

  it("ensureFreshOAuthCredentials skips the network call when not near expiry", async () => {
    mock = await startMockAuthorizationServer();
    const credentials = credentialsFor(mock.url, { expiresAt: 1_000_000 + 10 * 60_000 });

    const result = await ensureFreshOAuthCredentials(credentials, 1_000_000);

    expect(result).toBe(credentials);
    expect(mock.tokenRequests).toHaveLength(0);
  });

  it("ensureFreshOAuthCredentials refreshes when near expiry", async () => {
    mock = await startMockAuthorizationServer();
    const credentials = credentialsFor(mock.url, { expiresAt: 1_000_030 });

    const result = await ensureFreshOAuthCredentials(credentials, 1_000_000);

    expect(result.accessToken).toBe("access-token-2");
    expect(mock.tokenRequests).toHaveLength(1);
  });
});

describe("resolveConnectionHeaders", () => {
  it("rejects static_headers containing a reserved header before returning anything", async () => {
    await expect(
      resolveConnectionHeaders({
        type: "static_headers",
        headers: { "content-type": "text/plain" },
      }),
    ).rejects.toThrow(/reserved header/i);
  });

  it("returns headers unchanged for static_headers and none", async () => {
    const staticResult = await resolveConnectionHeaders({
      type: "static_headers",
      headers: { "x-api-key": "secret" },
    });
    expect(staticResult.headers).toEqual({ "x-api-key": "secret" });

    const noneResult = await resolveConnectionHeaders({ type: "none" });
    expect(noneResult.headers).toEqual({});
  });
});

describe("callWithOAuthRetry", () => {
  const credentials: OAuthCredentials = {
    type: "oauth",
    accessToken: "stale-token",
    refreshToken: "refresh-1",
    tokenEndpoint: "https://auth.example.com/token",
    clientId: "client-1",
    resource: "https://mcp.example.com",
  };

  it("returns the result directly when the first call succeeds", async () => {
    const makeCall = vi.fn().mockResolvedValue("ok");
    const { result, credentials: finalCredentials } = await callWithOAuthRetry(
      credentials,
      makeCall,
    );
    expect(result).toBe("ok");
    expect(finalCredentials).toBe(credentials);
    expect(makeCall).toHaveBeenCalledTimes(1);
  });

  it("re-throws non-401 errors without attempting a refresh", async () => {
    const makeCall = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(callWithOAuthRetry(credentials, makeCall)).rejects.toThrow("boom");
    expect(makeCall).toHaveBeenCalledTimes(1);
  });

  it("refreshes once and retries on a 401, returning the refreshed credentials", async () => {
    let mock: MockAuthorizationServer | undefined;
    try {
      mock = await startMockAuthorizationServer();
      const liveCredentials: OAuthCredentials = {
        ...credentials,
        tokenEndpoint: `${mock.url}/token`,
        resource: mock.url,
      };

      const makeCall = vi
        .fn()
        .mockRejectedValueOnce(new McpTransportError("unauthorized", 401))
        .mockResolvedValueOnce("ok-after-refresh");

      const { result, credentials: finalCredentials } = await callWithOAuthRetry(
        liveCredentials,
        makeCall,
      );

      expect(result).toBe("ok-after-refresh");
      expect(finalCredentials.accessToken).toBe("access-token-2");
      expect(makeCall).toHaveBeenCalledTimes(2);
      expect(makeCall).toHaveBeenLastCalledWith({ authorization: "Bearer access-token-2" });
    } finally {
      await mock?.close();
    }
  });
});
