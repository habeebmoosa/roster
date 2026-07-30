import { McpAuthError } from "../errors";
import type { DynamicClientRegistrationRequest, DynamicClientRegistrationResult } from "./types";

/**
 * RFC 7591 Dynamic Client Registration — registers Roster as an OAuth client with a
 * server it has never talked to before, rather than requiring a pre-shared client id.
 * The MVP registration path; Client ID Metadata Documents are a future alternative.
 */
export async function registerClient(
  registrationEndpoint: string,
  request: DynamicClientRegistrationRequest,
): Promise<DynamicClientRegistrationResult> {
  let response: Response;
  try {
    response = await fetch(registrationEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(request),
    });
  } catch (err) {
    throw new McpAuthError(
      "client_registration",
      `Could not reach client registration endpoint at ${registrationEndpoint}`,
      { cause: err },
    );
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new McpAuthError(
      "client_registration",
      `Client registration failed: HTTP ${response.status}${body ? ` — ${body}` : ""}`,
    );
  }
  return (await response.json()) as DynamicClientRegistrationResult;
}
