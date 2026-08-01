import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: () => auth() }));

const getAgentDefinition = vi.fn();
const upsertAgent = vi.fn();
vi.mock("@/server/db/repositories/agent.repository", () => ({
  getAgentDefinition: (...args: unknown[]) => getAgentDefinition(...args),
  upsertAgent: (...args: unknown[]) => upsertAgent(...args),
}));

const listUserProviders = vi.fn();
vi.mock("@/server/providers/service", () => ({
  listUserProviders: (...args: unknown[]) => listUserProviders(...args),
}));

const PARAMS = Promise.resolve({ id: "customer-support" });
const DEFINITION = {
  id: "customer-support",
  name: "Support",
  role: "Customer Support",
  identity: "...",
  voice: "...",
  expertise: [],
  abilities: [],
  memory: { semantic: [], procedural: [] },
  context_budget_tokens: 8000,
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/agents/customer-support/model", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/agents/[id]/model", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    getAgentDefinition.mockReset().mockResolvedValue(DEFINITION);
    upsertAgent.mockReset();
    listUserProviders.mockReset().mockResolvedValue([{ provider: "openai" }]);
  });

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValueOnce(null);
    const { PATCH } = await import("./route");
    const res = await PATCH(request({ provider: "openai", model: "gpt-4o-mini" }), { params: PARAMS });
    expect(res.status).toBe(401);
    expect(upsertAgent).not.toHaveBeenCalled();
  });

  it("returns 400 on a malformed body", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(request({ provider: "" }), { params: PARAMS });
    expect(res.status).toBe(400);
    expect(upsertAgent).not.toHaveBeenCalled();
  });

  it("returns 404 when the employee doesn't exist", async () => {
    getAgentDefinition.mockResolvedValueOnce(null);
    const { PATCH } = await import("./route");
    const res = await PATCH(request({ provider: "openai", model: "gpt-4o-mini" }), { params: PARAMS });
    expect(res.status).toBe(404);
  });

  it("returns 400 for a provider not in the catalog", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(request({ provider: "not-a-real-provider", model: "x" }), {
      params: PARAMS,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("unknown_provider");
    expect(upsertAgent).not.toHaveBeenCalled();
  });

  it("returns 400 when the user hasn't connected that provider", async () => {
    listUserProviders.mockResolvedValueOnce([{ provider: "anthropic" }]);
    const { PATCH } = await import("./route");
    const res = await PATCH(request({ provider: "openai", model: "gpt-4o-mini" }), { params: PARAMS });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("provider_not_connected");
    expect(upsertAgent).not.toHaveBeenCalled();
  });

  it("sets the agent's default model, preserving the rest of the definition", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(request({ provider: "openai", model: "gpt-4o-mini" }), { params: PARAMS });

    expect(res.status).toBe(200);
    expect(upsertAgent).toHaveBeenCalledWith({
      ...DEFINITION,
      model: { provider: "openai", model: "gpt-4o-mini" },
    });
  });
});
