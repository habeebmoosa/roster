import { McpAuthError } from "../errors";
import type { AuthorizationServerMetadata, ProtectedResourceMetadata } from "./types";

/** RFC 9728 / RFC 8414 well-known convention: the segment is inserted between the host and any existing path. */
function insertWellKnownSegment(baseUrl: string, wellKnownSegment: string): string {
  const url = new URL(baseUrl);
  const existingPath = url.pathname.replace(/\/$/, "");
  url.pathname = `/.well-known/${wellKnownSegment}${existingPath}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

/** OIDC Discovery convention: unlike RFC 8414, the well-known segment is appended after the path, not inserted before it. */
function appendOidcDiscoveryPath(issuer: string): string {
  const url = new URL(issuer);
  const existingPath = url.pathname.replace(/\/$/, "");
  url.pathname = `${existingPath}/.well-known/openid-configuration`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

/**
 * Resolves the Protected Resource Metadata URL (RFC 9728) for an MCP server: the
 * `resource_metadata` parameter on a 401's `WWW-Authenticate` header if the server
 * sent one, otherwise the default well-known location derived from the server's own URL.
 */
export function resolveProtectedResourceMetadataUrl(
  resourceServerUrl: string,
  wwwAuthenticateHeader?: string | null,
): string {
  if (wwwAuthenticateHeader) {
    const match = /resource_metadata="([^"]+)"/.exec(wwwAuthenticateHeader);
    if (match?.[1]) return match[1];
  }
  return insertWellKnownSegment(resourceServerUrl, "oauth-protected-resource");
}

export async function fetchProtectedResourceMetadata(
  metadataUrl: string,
): Promise<ProtectedResourceMetadata> {
  let response: Response;
  try {
    response = await fetch(metadataUrl, { headers: { accept: "application/json" } });
  } catch (err) {
    throw new McpAuthError(
      "resource_metadata_discovery",
      `Could not reach protected resource metadata at ${metadataUrl}`,
      { cause: err },
    );
  }
  if (!response.ok) {
    throw new McpAuthError(
      "resource_metadata_discovery",
      `Protected resource metadata request failed: HTTP ${response.status}`,
    );
  }
  return (await response.json()) as ProtectedResourceMetadata;
}

/**
 * Discovers Authorization Server Metadata for one issuer — RFC 8414 first, falling
 * back to OIDC Discovery, since some authorization servers only publish the latter.
 */
export async function fetchAuthorizationServerMetadata(
  issuer: string,
): Promise<AuthorizationServerMetadata> {
  const candidateUrls = [
    insertWellKnownSegment(issuer, "oauth-authorization-server"),
    appendOidcDiscoveryPath(issuer),
  ];

  let lastError: unknown;
  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (response.ok) return (await response.json()) as AuthorizationServerMetadata;
      lastError = new Error(`HTTP ${response.status} from ${url}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw new McpAuthError(
    "authorization_server_discovery",
    `Could not discover authorization server metadata for issuer "${issuer}"`,
    { cause: lastError },
  );
}
