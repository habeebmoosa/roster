import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: () => auth() }));

const getAgentDefinition = vi.fn();
const upsertAgent = vi.fn();
vi.mock("@/server/db/repositories/agent.repository", () => ({
  getAgentDefinition: (...args: unknown[]) => getAgentDefinition(...args),
  upsertAgent: (...args: unknown[]) => upsertAgent(...args),
}));

const logEvent = vi.fn();
vi.mock("@/server/analytics/log-event", () => ({
  logEvent: (...args: unknown[]) => logEvent(...args),
}));

function request(body: unknown): Request {
  return new Request("http://localhost/api/agents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  id: "test-agent",
  name: "Test Employee",
  role: "QA Specialist",
  identity: "Thorough.",
  voice: "Direct.",
};

describe("POST /api/agents — analytics", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    getAgentDefinition.mockReset().mockResolvedValue(null);
    upsertAgent.mockReset().mockResolvedValue(undefined);
    logEvent.mockClear();
  });

  it("logs employee_hired after a successful create", async () => {
    const { POST } = await import("./route");

    const res = await POST(request(VALID_BODY));

    expect(res.status).toBe(201);
    expect(logEvent).toHaveBeenCalledWith({
      userId: "user-1",
      event: "employee_hired",
      metadata: { agentId: "test-agent" },
    });
  });

  it("does not log when the agent id already exists (409)", async () => {
    getAgentDefinition.mockResolvedValue({ id: "test-agent" });
    const { POST } = await import("./route");

    const res = await POST(request(VALID_BODY));

    expect(res.status).toBe(409);
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("does not log on a malformed definition (400)", async () => {
    const { POST } = await import("./route");

    const res = await POST(request({ id: "" }));

    expect(res.status).toBe(400);
    expect(logEvent).not.toHaveBeenCalled();
  });
});
