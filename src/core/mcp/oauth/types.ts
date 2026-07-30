/** RFC 9728 Protected Resource Metadata — points from the MCP server to the authorization server(s) that can issue it tokens. */
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  [key: string]: unknown;
}

/** RFC 8414 Authorization Server Metadata (or its OIDC Discovery equivalent). */
export interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  code_challenge_methods_supported?: string[];
  [key: string]: unknown;
}

/** RFC 7591 Dynamic Client Registration request body. */
export interface DynamicClientRegistrationRequest {
  redirect_uris: string[];
  client_name?: string;
  token_endpoint_auth_method?: "none" | "client_secret_post" | "client_secret_basic";
  grant_types?: string[];
  response_types?: string[];
  [key: string]: unknown;
}

export interface DynamicClientRegistrationResult {
  client_id: string;
  client_secret?: string;
  [key: string]: unknown;
}

/** RFC 6749 §5.1 token response, as returned by both the authorization_code and refresh_token grants. */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  /** May differ from the refresh token that was spent — rotation is common; callers must persist this if present. */
  refresh_token?: string;
  scope?: string;
  [key: string]: unknown;
}
