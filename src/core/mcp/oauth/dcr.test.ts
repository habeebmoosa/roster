import { afterEach, describe, expect, it } from "vitest";
import { registerClient } from "./dcr";
import { McpAuthError } from "../errors";
import {
  startMockAuthorizationServer,
  type MockAuthorizationServer,
} from "./test-mock-authorization-server";

describe("registerClient", () => {
  let mock: MockAuthorizationServer;

  afterEach(async () => {
    await mock.close();
  });

  it("registers a client and returns its client_id", async () => {
    mock = await startMockAuthorizationServer();

    const result = await registerClient(`${mock.url}/register`, {
      redirect_uris: ["https://roster.example.com/oauth/callback"],
      client_name: "Roster",
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    });

    expect(result.client_id).toBe("mock-client-id");
    expect(mock.registrationRequests[0]).toMatchObject({
      client_name: "Roster",
      redirect_uris: ["https://roster.example.com/oauth/callback"],
    });
  });

  it("throws McpAuthError when the registration endpoint is unreachable", async () => {
    await expect(
      registerClient("http://127.0.0.1:1/register", { redirect_uris: [] }),
    ).rejects.toThrow(McpAuthError);
  });
});
