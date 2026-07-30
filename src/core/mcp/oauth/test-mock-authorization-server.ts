import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export interface MockAuthorizationServer {
  url: string;
  /** Requests made to the registration and token endpoints, in order (for assertions). */
  registrationRequests: Array<Record<string, unknown>>;
  tokenRequests: Array<Record<string, string>>;
  close: () => Promise<void>;
}

const VALID_AUTH_CODE = "valid-code";
const INITIAL_REFRESH_TOKEN = "refresh-1";
const ROTATED_REFRESH_TOKEN = "refresh-2";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw;
}

/**
 * A real HTTP server standing in for an MCP-compatible authorization server: Protected
 * Resource Metadata (RFC 9728), Authorization Server Metadata (RFC 8414 + an OIDC-Discovery
 * variant), Dynamic Client Registration (RFC 7591), and a token endpoint covering both the
 * authorization_code and refresh_token grants, including refresh-token rotation.
 */
export async function startMockAuthorizationServer(): Promise<MockAuthorizationServer> {
  const registrationRequests: Array<Record<string, unknown>> = [];
  const tokenRequests: Array<Record<string, string>> = [];

  const server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

      if (req.method === "GET" && url.pathname === "/.well-known/oauth-protected-resource") {
        sendJson(res, 200, { resource: base, authorization_servers: [base] });
        return;
      }

      if (
        req.method === "GET" &&
        (url.pathname === "/.well-known/oauth-authorization-server" ||
          url.pathname === "/.well-known/openid-configuration")
      ) {
        sendJson(res, 200, {
          issuer: base,
          authorization_endpoint: `${base}/authorize`,
          token_endpoint: `${base}/token`,
          registration_endpoint: `${base}/register`,
          code_challenge_methods_supported: ["S256"],
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/register") {
        const body = JSON.parse(await readBody(req)) as Record<string, unknown>;
        registrationRequests.push(body);
        sendJson(res, 201, { client_id: "mock-client-id" });
        return;
      }

      if (req.method === "POST" && url.pathname === "/token") {
        const raw = await readBody(req);
        const params = Object.fromEntries(new URLSearchParams(raw));
        tokenRequests.push(params);

        if (params.grant_type === "authorization_code") {
          if (params.code !== VALID_AUTH_CODE || !params.resource || !params.code_verifier) {
            sendJson(res, 400, { error: "invalid_grant" });
            return;
          }
          sendJson(res, 200, {
            access_token: "access-token-1",
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: INITIAL_REFRESH_TOKEN,
            scope: "mcp",
          });
          return;
        }

        if (params.grant_type === "refresh_token") {
          if (params.refresh_token !== INITIAL_REFRESH_TOKEN || !params.resource) {
            sendJson(res, 400, { error: "invalid_grant" });
            return;
          }
          sendJson(res, 200, {
            access_token: "access-token-2",
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: ROTATED_REFRESH_TOKEN,
            scope: "mcp",
          });
          return;
        }

        sendJson(res, 400, { error: "unsupported_grant_type" });
        return;
      }

      res.writeHead(404);
      res.end();
    })();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}`,
    registrationRequests,
    tokenRequests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
