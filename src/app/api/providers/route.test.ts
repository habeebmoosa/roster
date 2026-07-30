import { beforeEach, describe, expect, it, vi } from "vitest";
import { ByokError } from "@/core/providers";

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

const auth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: () => auth() }));

const addProviderKey = vi.fn();
vi.mock("@/server/providers/service", () => ({
  addProviderKey: (...args: unknown[]) => addProviderKey(...args),
}));

function request(body: unknown): Request {
  return new Request("http://localhost/api/providers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = { provider: "openai", apiKey: "sk-test", model: "gpt-4o-mini" };

describe("POST /api/providers — Sentry capture", () => {
  beforeEach(() => {
    captureException.mockClear();
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    addProviderKey.mockReset();
  });

  it("does not report to Sentry when addProviderKey rejects with a ByokError (expected, user-actionable)", async () => {
    addProviderKey.mockRejectedValueOnce(new ByokError("invalid_key"));
    const { POST } = await import("./route");

    const res = await POST(request(VALID_BODY));

    expect(res.status).toBe(400);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("reports to Sentry when addProviderKey rejects with anything else (unexpected)", async () => {
    const boom = new Error("boom");
    addProviderKey.mockRejectedValueOnce(boom);
    const { POST } = await import("./route");

    const res = await POST(request(VALID_BODY));

    expect(res.status).toBe(500);
    expect(captureException).toHaveBeenCalledWith(boom);
  });
});
