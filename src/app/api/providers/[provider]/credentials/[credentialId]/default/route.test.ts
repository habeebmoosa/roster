import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: () => auth() }));

const setDefaultProviderCredential = vi.fn();
vi.mock("@/server/providers/service", () => ({
  setDefaultProviderCredential: (...args: unknown[]) => setDefaultProviderCredential(...args),
}));

const PARAMS = Promise.resolve({ provider: "openai", credentialId: "cred-1" });

describe("POST /api/providers/[provider]/credentials/[credentialId]/default", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    setDefaultProviderCredential.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValueOnce(null);
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/x"), { params: PARAMS });
    expect(res.status).toBe(401);
    expect(setDefaultProviderCredential).not.toHaveBeenCalled();
  });

  it("marks the credential as default for this user and provider", async () => {
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/x"), { params: PARAMS });
    expect(res.status).toBe(200);
    expect(setDefaultProviderCredential).toHaveBeenCalledWith("user-1", "openai", "cred-1");
  });
});
