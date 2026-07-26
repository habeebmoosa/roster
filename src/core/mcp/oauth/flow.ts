import { McpAuthError, type McpAuthErrorStage } from "../errors";
import type { TokenResponse } from "./types";

export interface BuildAuthorizationUrlInput {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  /** The RFC 8707 `resource` parameter — the canonical URI of the MCP server this token must be scoped to. Non-negotiable: without it a token minted for one server could be replayed against another. */
  resource: string;
  scope?: string;
}

/** Builds the URL to send the user's browser to for consent. */
export function buildAuthorizationUrl(input: BuildAuthorizationUrlInput): string {
  const url = new URL(input.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", input.state);
  url.searchParams.set("resource", input.resource);
  if (input.scope) url.searchParams.set("scope", input.scope);
  return url.toString();
}

async function postTokenRequest(
  tokenEndpoint: string,
  params: Record<string, string>,
  stage: McpAuthErrorStage,
): Promise<TokenResponse> {
  let response: Response;
  try {
    response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: new URLSearchParams(params).toString(),
    });
  } catch (err) {
    throw new McpAuthError(stage, `Could not reach token endpoint at ${tokenEndpoint}`, {
      cause: err,
    });
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new McpAuthError(
      stage,
      `Token request failed: HTTP ${response.status}${body ? ` — ${body}` : ""}`,
    );
  }
  return (await response.json()) as TokenResponse;
}

export interface ExchangeCodeForTokenInput {
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  resource: string;
}

/** Exchanges an authorization code for tokens, proving possession of the PKCE verifier and re-asserting the `resource` this token is scoped to. */
export function exchangeCodeForToken(input: ExchangeCodeForTokenInput): Promise<TokenResponse> {
  const params: Record<string, string> = {
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    code_verifier: input.codeVerifier,
    resource: input.resource,
  };
  if (input.clientSecret) params.client_secret = input.clientSecret;
  return postTokenRequest(input.tokenEndpoint, params, "token_exchange");
}

export interface RefreshAccessTokenInput {
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
  resource: string;
}

/**
 * Refreshes an access token. The authorization server may rotate the refresh token —
 * callers must persist `refresh_token` from the response when present, replacing the
 * one that was just spent, or the next refresh will fail.
 */
export function refreshAccessToken(input: RefreshAccessTokenInput): Promise<TokenResponse> {
  const params: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    resource: input.resource,
  };
  if (input.clientSecret) params.client_secret = input.clientSecret;
  return postTokenRequest(input.tokenEndpoint, params, "token_refresh");
}
