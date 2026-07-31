import { beforeEach, describe, expect, it, vi } from "vitest";
import { ByokError } from "@/core/providers";

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

const auth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: () => auth() }));

const updateProviderCredential = vi.fn();
const removeProviderCredential = vi.fn();
vi.mock("@/server/providers/service", () => ({
  updateProviderCredential: (...args: unknown[]) => updateProviderCredential(...args),
  removeProviderCredential: (...args: unknown[]) => removeProviderCredential(...args),
}));

function patchRequest(body: unknown): Request {
  return new Request("http://localhost/api/providers/openai/credentials/cred-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARAMS = Promise.resolve({ provider: "openai", credentialId: "cred-1" });

describe("PATCH /api/providers/[provider]/credentials/[credentialId]", () => {
  beforeEach(() => {
    captureException.mockClear();
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    updateProviderCredential.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValueOnce(null);
    const { PATCH } = await import("./route");
    const res = await PATCH(patchRequest({ label: "Work" }), { params: PARAMS });
    expect(res.status).toBe(401);
    expect(updateProviderCredential).not.toHaveBeenCalled();
  });

  it("passes the parsed body and credential id through to the service", async () => {
    updateProviderCredential.mockResolvedValueOnce({ id: "cred-1", label: "Work" });
    const { PATCH } = await import("./route");

    const res = await PATCH(patchRequest({ label: "Work", baseUrl: null }), { params: PARAMS });

    expect(res.status).toBe(200);
    expect(updateProviderCredential).toHaveBeenCalledWith("user-1", "cred-1", {
      label: "Work",
      baseUrl: null,
    });
  });

  it("maps not_found to a 404", async () => {
    updateProviderCredential.mockRejectedValueOnce(new ByokError("not_found"));
    const { PATCH } = await import("./route");

    const res = await PATCH(patchRequest({ label: "Work" }), { params: PARAMS });
    expect(res.status).toBe(404);
  });

  it("maps any other ByokError to a 400 without reporting to Sentry", async () => {
    updateProviderCredential.mockRejectedValueOnce(new ByokError("invalid_key"));
    const { PATCH } = await import("./route");

    const res = await PATCH(patchRequest({ apiKey: "bad" }), { params: PARAMS });
    expect(res.status).toBe(400);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("reports an unexpected error to Sentry and returns 500", async () => {
    const boom = new Error("boom");
    updateProviderCredential.mockRejectedValueOnce(boom);
    const { PATCH } = await import("./route");

    const res = await PATCH(patchRequest({ label: "Work" }), { params: PARAMS });
    expect(res.status).toBe(500);
    expect(captureException).toHaveBeenCalledWith(boom);
  });

  it("rejects a malformed body with 400 before calling the service", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(
      new Request("http://localhost/x", { method: "PATCH", body: "not json" }),
      { params: PARAMS },
    );
    expect(res.status).toBe(400);
    expect(updateProviderCredential).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/providers/[provider]/credentials/[credentialId]", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    removeProviderCredential.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValueOnce(null);
    const { DELETE } = await import("./route");
    const res = await DELETE(new Request("http://localhost/x"), { params: PARAMS });
    expect(res.status).toBe(401);
    expect(removeProviderCredential).not.toHaveBeenCalled();
  });

  it("deletes the credential by user and credential id", async () => {
    const { DELETE } = await import("./route");
    const res = await DELETE(new Request("http://localhost/x"), { params: PARAMS });
    expect(res.status).toBe(200);
    expect(removeProviderCredential).toHaveBeenCalledWith("user-1", "cred-1");
  });
});
