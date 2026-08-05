import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: () => auth() }));

const getAgentDefinition = vi.fn();
const updateAgentStatus = vi.fn();
vi.mock("@/server/db/repositories/agent.repository", () => ({
  getAgentDefinition: (...args: unknown[]) => getAgentDefinition(...args),
  updateAgentStatus: (...args: unknown[]) => updateAgentStatus(...args),
}));

const PARAMS = Promise.resolve({ id: "customer-support" });
const DEFINITION = { id: "customer-support", name: "Support", role: "Customer Support" };

function request(body: unknown): Request {
  return new Request("http://localhost/api/agents/customer-support/status", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/agents/[id]/status", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    getAgentDefinition.mockReset().mockResolvedValue(DEFINITION);
    updateAgentStatus.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValueOnce(null);
    const { PATCH } = await import("./route");
    const res = await PATCH(request({ status: "paused" }), { params: PARAMS });
    expect(res.status).toBe(401);
    expect(updateAgentStatus).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid status value", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(request({ status: "disabled" }), { params: PARAMS });
    expect(res.status).toBe(400);
    expect(updateAgentStatus).not.toHaveBeenCalled();
  });

  it("returns 404 when the employee doesn't exist", async () => {
    getAgentDefinition.mockResolvedValueOnce(null);
    const { PATCH } = await import("./route");
    const res = await PATCH(request({ status: "paused" }), { params: PARAMS });
    expect(res.status).toBe(404);
    expect(updateAgentStatus).not.toHaveBeenCalled();
  });

  it("pauses the employee", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(request({ status: "paused" }), { params: PARAMS });
    expect(res.status).toBe(200);
    expect(updateAgentStatus).toHaveBeenCalledWith("customer-support", "paused");
    const body = await res.json();
    expect(body).toEqual({ ok: true, status: "paused" });
  });

  it("resumes the employee", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(request({ status: "active" }), { params: PARAMS });
    expect(res.status).toBe(200);
    expect(updateAgentStatus).toHaveBeenCalledWith("customer-support", "active");
  });
});
