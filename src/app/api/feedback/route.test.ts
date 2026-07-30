import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: () => auth() }));

const createFeedback = vi.fn();
vi.mock("@/server/db/repositories/feedback.repository", () => ({
  createFeedback: (...args: unknown[]) => createFeedback(...args),
}));

function request(body: unknown): Request {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    createFeedback.mockReset().mockResolvedValue({ id: "fb-1" });
  });

  it("401s when signed out", async () => {
    auth.mockResolvedValue(null);
    const { POST } = await import("./route");

    const res = await POST(request({ message: "hi" }));

    expect(res.status).toBe(401);
    expect(createFeedback).not.toHaveBeenCalled();
  });

  it("400s on an empty message", async () => {
    const { POST } = await import("./route");

    const res = await POST(request({ message: "   " }));

    expect(res.status).toBe(400);
    expect(createFeedback).not.toHaveBeenCalled();
  });

  it("persists the trimmed message for the signed-in user", async () => {
    const { POST } = await import("./route");

    const res = await POST(request({ message: "Love the product!" }));

    expect(res.status).toBe(200);
    expect(createFeedback).toHaveBeenCalledWith({
      userId: "user-1",
      message: "Love the product!",
    });
  });
});
