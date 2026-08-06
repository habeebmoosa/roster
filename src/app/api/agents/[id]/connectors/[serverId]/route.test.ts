import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: () => auth() }));

const getAgentDefinition = vi.fn();
vi.mock("@/server/db/repositories/agent.repository", () => ({
  getAgentDefinition: (...args: unknown[]) => getAgentDefinition(...args),
}));

const enableMcpServerForAgent = vi.fn();
const disableMcpServerForAgent = vi.fn();
vi.mock("@/server/db/repositories/agent-mcp-server.repository", () => ({
  enableMcpServerForAgent: (...args: unknown[]) => enableMcpServerForAgent(...args),
  disableMcpServerForAgent: (...args: unknown[]) => disableMcpServerForAgent(...args),
}));

const listMcpServersForUser = vi.fn();
vi.mock("@/server/mcp/connect-service", () => ({
  listMcpServersForUser: (...args: unknown[]) => listMcpServersForUser(...args),
}));

const PARAMS = Promise.resolve({ id: "customer-support", serverId: "linear" });
const DEFINITION = { id: "customer-support", name: "Support", role: "Customer Support" };

function request(method: string): Request {
  return new Request("http://localhost/api/agents/customer-support/connectors/linear", { method });
}

describe("POST /api/agents/[id]/connectors/[serverId]", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    getAgentDefinition.mockReset().mockResolvedValue(DEFINITION);
    enableMcpServerForAgent.mockReset();
    disableMcpServerForAgent.mockReset();
    listMcpServersForUser.mockReset().mockResolvedValue([
      { id: "linear", connected: true },
      { id: "notion", connected: false },
    ]);
  });

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValueOnce(null);
    const { POST } = await import("./route");
    const res = await POST(request("POST"), { params: PARAMS });
    expect(res.status).toBe(401);
    expect(enableMcpServerForAgent).not.toHaveBeenCalled();
  });

  it("returns 404 when the employee doesn't exist", async () => {
    getAgentDefinition.mockResolvedValueOnce(null);
    const { POST } = await import("./route");
    const res = await POST(request("POST"), { params: PARAMS });
    expect(res.status).toBe(404);
    expect(enableMcpServerForAgent).not.toHaveBeenCalled();
  });

  it("returns 400 when the connector isn't connected at all", async () => {
    listMcpServersForUser.mockResolvedValueOnce([{ id: "notion", connected: false }]);
    const { POST } = await import("./route");
    const res = await POST(request("POST"), { params: PARAMS });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("connector_not_connected");
    expect(enableMcpServerForAgent).not.toHaveBeenCalled();
  });

  it("returns 400 when the connector exists but isn't connected by this user", async () => {
    listMcpServersForUser.mockResolvedValueOnce([{ id: "linear", connected: false }]);
    const { POST } = await import("./route");
    const res = await POST(request("POST"), { params: PARAMS });
    expect(res.status).toBe(400);
    expect(enableMcpServerForAgent).not.toHaveBeenCalled();
  });

  it("enables the connector for the agent", async () => {
    const { POST } = await import("./route");
    const res = await POST(request("POST"), { params: PARAMS });
    expect(res.status).toBe(200);
    expect(enableMcpServerForAgent).toHaveBeenCalledWith("user-1", "customer-support", "linear");
  });
});

describe("DELETE /api/agents/[id]/connectors/[serverId]", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    disableMcpServerForAgent.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValueOnce(null);
    const { DELETE } = await import("./route");
    const res = await DELETE(request("DELETE"), { params: PARAMS });
    expect(res.status).toBe(401);
    expect(disableMcpServerForAgent).not.toHaveBeenCalled();
  });

  it("disables the connector for the agent", async () => {
    const { DELETE } = await import("./route");
    const res = await DELETE(request("DELETE"), { params: PARAMS });
    expect(res.status).toBe(200);
    expect(disableMcpServerForAgent).toHaveBeenCalledWith("user-1", "customer-support", "linear");
  });
});
