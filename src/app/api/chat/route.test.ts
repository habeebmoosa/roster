import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentNotFoundError } from "@/server/agents/service";
import { ConversationNotFoundError } from "@/server/chat/service";

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

const auth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: () => auth() }));

const sendChatMessage = vi.fn();
vi.mock("@/server/chat/service", async () => {
  const actual =
    await vi.importActual<typeof import("@/server/chat/service")>("@/server/chat/service");
  return { ...actual, sendChatMessage: (...args: unknown[]) => sendChatMessage(...args) };
});

function request(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  agentId: "customer-support",
  provider: "custom",
  model: "mock-model",
  content: "hi",
};

describe("POST /api/chat — Sentry capture", () => {
  beforeEach(() => {
    captureException.mockClear();
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    sendChatMessage.mockReset();
  });

  it("does not report to Sentry for an unknown agent (expected, user-actionable 404)", async () => {
    sendChatMessage.mockRejectedValueOnce(new AgentNotFoundError("does-not-exist"));
    const { POST } = await import("./route");

    const res = await POST(request(VALID_BODY));

    expect(res.status).toBe(404);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("does not report to Sentry for an unknown conversation (expected, user-actionable 404)", async () => {
    sendChatMessage.mockRejectedValueOnce(new ConversationNotFoundError("does-not-exist"));
    const { POST } = await import("./route");

    const res = await POST(request(VALID_BODY));

    expect(res.status).toBe(404);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("reports to Sentry when sendChatMessage rejects with anything else (unexpected)", async () => {
    const boom = new Error("boom");
    sendChatMessage.mockRejectedValueOnce(boom);
    const { POST } = await import("./route");

    const res = await POST(request(VALID_BODY));

    expect(res.status).toBe(500);
    expect(captureException).toHaveBeenCalledWith(boom);
  });
});
