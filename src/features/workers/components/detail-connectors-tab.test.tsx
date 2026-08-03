// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentConnectorOption } from "@/server/mcp/connect-service";
import { DetailConnectorsTab } from "./detail-connectors-tab";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...args: unknown[]) => toast(...args) }));

function connector(overrides: Partial<AgentConnectorOption> = {}): AgentConnectorOption {
  return {
    id: "linear",
    name: "Linear",
    description: "Issue tracking",
    iconUrl: null,
    developer: null,
    connectorUrl: "https://mcp.linear.app/mcp",
    authType: "oauth_dcr",
    categories: [],
    trustTier: "verified",
    cachedTools: [],
    cachedResources: [],
    documentationUrl: null,
    supportUrl: null,
    privacyPolicyUrl: null,
    preRegisteredClientId: null,
    createdByUserId: null,
    createdAt: new Date("2026-01-01"),
    connected: true,
    connectionStatus: "active",
    enabled: false,
    ...overrides,
  };
}

beforeEach(() => {
  refresh.mockClear();
  toast.mockClear();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchOnce(status: number, body: unknown) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: async () => body,
  });
}

describe("DetailConnectorsTab", () => {
  it("shows an empty state with a link to Connectors when nothing is connected", () => {
    render(<DetailConnectorsTab agentId="customer-support" connectors={[]} />);
    expect(screen.getByText("No connectors connected yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to Connectors/ })).toHaveAttribute("href", "/connectors");
  });

  it("lists each connected server with its trust badge and enabled state", () => {
    render(
      <DetailConnectorsTab
        agentId="customer-support"
        connectors={[
          connector({ id: "linear", name: "Linear", trustTier: "verified", enabled: true }),
          connector({ id: "acme-crm", name: "Acme CRM", trustTier: "custom", enabled: false }),
        ]}
      />,
    );
    expect(screen.getByText("Linear")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Acme CRM")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Linear" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Acme CRM" })).not.toBeChecked();
  });

  it("enables a disabled connector via POST, then toasts and refreshes", async () => {
    mockFetchOnce(200, { ok: true });
    const user = userEvent.setup();
    render(
      <DetailConnectorsTab
        agentId="customer-support"
        connectors={[connector({ id: "linear", enabled: false })]}
      />,
    );

    await user.click(screen.getByRole("switch", { name: "Linear" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      "/api/agents/customer-support/connectors/linear",
      expect.objectContaining({ method: "POST" }),
    );
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
  });

  it("disables an enabled connector via DELETE", async () => {
    mockFetchOnce(200, { ok: true });
    const user = userEvent.setup();
    render(
      <DetailConnectorsTab
        agentId="customer-support"
        connectors={[connector({ id: "linear", enabled: true })]}
      />,
    );

    await user.click(screen.getByRole("switch", { name: "Linear" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      "/api/agents/customer-support/connectors/linear",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("shows the server's error message on a rejected toggle, without refreshing", async () => {
    mockFetchOnce(400, { error: { message: "Connect this connector in Settings before assigning it here." } });
    const user = userEvent.setup();
    render(
      <DetailConnectorsTab
        agentId="customer-support"
        connectors={[connector({ id: "linear", enabled: false })]}
      />,
    );

    await user.click(screen.getByRole("switch", { name: "Linear" }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Connect this connector in Settings before assigning it here.",
          variant: "danger",
        }),
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
