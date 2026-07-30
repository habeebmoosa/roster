import { McpTransportError } from "./errors";
import { refreshAccessToken } from "./oauth/flow";
import type { TokenResponse } from "./oauth/types";

/** A fixed set of HTTP headers (e.g. `Authorization: Bearer <token>`, or a custom API-key header) — the fallback auth mode for MCP servers that don't support OAuth. */
export interface StaticHeadersCredentials {
  type: "static_headers";
  headers: Record<string, string>;
}

export interface OAuthCredentials {
  type: "oauth";
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds; undefined means the server never told us an expiry — treated as always-fresh. */
  expiresAt?: number;
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  /** The RFC 8707 resource identifier this token is scoped to — required to refresh. */
  resource: string;
}

export interface NoneCredentials {
  type: "none";
}

export type McpConnectionCredentials =
  StaticHeadersCredentials | OAuthCredentials | NoneCredentials;

/** Headers the transport itself controls (see transport.ts's `post()`) — static_headers must never be able to override them. */
const RESERVED_HEADER_NAMES = new Set(["content-type", "accept", "mcp-session-id"]);

export function validateStaticHeaders(headers: Record<string, string>): void {
  for (const name of Object.keys(headers)) {
    if (RESERVED_HEADER_NAMES.has(name.toLowerCase())) {
      throw new Error(`"${name}" is a reserved header and cannot be set via static_headers`);
    }
  }
}

const EXPIRY_REFRESH_BUFFER_MS = 60_000;

export function isNearExpiry(credentials: OAuthCredentials, now: number = Date.now()): boolean {
  if (credentials.expiresAt === undefined) return false;
  return credentials.expiresAt - now <= EXPIRY_REFRESH_BUFFER_MS;
}

function applyTokenResponse(
  credentials: OAuthCredentials,
  tokenResponse: TokenResponse,
  now: number,
): OAuthCredentials {
  return {
    ...credentials,
    accessToken: tokenResponse.access_token,
    // The server may rotate the refresh token; keep the old one only if it didn't send a new one.
    refreshToken: tokenResponse.refresh_token ?? credentials.refreshToken,
    expiresAt:
      tokenResponse.expires_in !== undefined ? now + tokenResponse.expires_in * 1000 : undefined,
  };
}

/** Refreshes OAuth credentials unconditionally. Throws if there's no refresh token, or McpAuthError if the server rejects it. */
export async function refreshOAuthCredentials(
  credentials: OAuthCredentials,
  now: number = Date.now(),
): Promise<OAuthCredentials> {
  if (!credentials.refreshToken) {
    throw new Error("Cannot refresh MCP OAuth credentials: no refresh token available");
  }
  const tokenResponse = await refreshAccessToken({
    tokenEndpoint: credentials.tokenEndpoint,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    refreshToken: credentials.refreshToken,
    resource: credentials.resource,
  });
  return applyTokenResponse(credentials, tokenResponse, now);
}

/** Proactively refreshes only if the access token is at or near expiry; otherwise returns it unchanged. */
export async function ensureFreshOAuthCredentials(
  credentials: OAuthCredentials,
  now: number = Date.now(),
): Promise<OAuthCredentials> {
  if (!isNearExpiry(credentials, now)) return credentials;
  return refreshOAuthCredentials(credentials, now);
}

/** Builds the HTTP headers for an MCP request under any connection auth mode. Does not refresh — call ensureFreshOAuthCredentials first for "oauth". */
export function buildConnectionHeaders(
  credentials: McpConnectionCredentials,
): Record<string, string> {
  switch (credentials.type) {
    case "static_headers":
      return { ...credentials.headers };
    case "oauth":
      return { authorization: `Bearer ${credentials.accessToken}` };
    case "none":
      return {};
  }
}

/**
 * Resolves ready-to-use request headers for a connection: validates static headers,
 * or proactively refreshes OAuth credentials near expiry. Returns the (possibly
 * refreshed) credentials alongside the headers so a caller with DB access can persist
 * a refresh before it's needed again.
 */
export async function resolveConnectionHeaders(
  credentials: McpConnectionCredentials,
  now: number = Date.now(),
): Promise<{ headers: Record<string, string>; credentials: McpConnectionCredentials }> {
  if (credentials.type === "static_headers") validateStaticHeaders(credentials.headers);
  const fresh =
    credentials.type === "oauth"
      ? await ensureFreshOAuthCredentials(credentials, now)
      : credentials;
  return { headers: buildConnectionHeaders(fresh), credentials: fresh };
}

function isUnauthorized(err: unknown): boolean {
  return err instanceof McpTransportError && err.httpStatus === 401;
}

/**
 * Runs an MCP call, reactively refreshing once and retrying if the server rejects the
 * current access token with 401 — a fallback for clock skew or an access token revoked
 * early, on top of the proactive refresh resolveConnectionHeaders already does.
 */
export async function callWithOAuthRetry<T>(
  credentials: OAuthCredentials,
  makeCall: (headers: Record<string, string>) => Promise<T>,
  now: number = Date.now(),
): Promise<{ result: T; credentials: OAuthCredentials }> {
  try {
    const result = await makeCall(buildConnectionHeaders(credentials));
    return { result, credentials };
  } catch (err) {
    if (!isUnauthorized(err)) throw err;
    const refreshed = await refreshOAuthCredentials(credentials, now);
    const result = await makeCall(buildConnectionHeaders(refreshed));
    return { result, credentials: refreshed };
  }
}
