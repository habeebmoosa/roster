// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { McpServerListItem } from "@/server/mcp/connect-service";
import { StepConnectors } from "./step-connectors";

function connector(overrides: Partial<McpServerListItem> = {}): McpServerListItem {
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
    ...overrides,
  };
}

describe("StepConnectors", () => {
  it("shows an empty state with a link to Connectors when nothing is connected", () => {
    render(<StepConnectors connectors={[]} selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByText("No connectors connected yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to Connectors/ })).toHaveAttribute("href", "/connectors");
  });

  it("lists each connected server with its trust badge", () => {
    render(
      <StepConnectors
        connectors={[
          connector({ id: "linear", name: "Linear", trustTier: "verified" }),
          connector({ id: "acme-crm", name: "Acme CRM", trustTier: "custom" }),
        ]}
        selected={[]}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText("Linear")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Acme CRM")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("reflects selected connectors as checked switches", () => {
    render(
      <StepConnectors
        connectors={[connector({ id: "linear", name: "Linear" })]}
        selected={["linear"]}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByRole("switch", { name: "Linear" })).toBeChecked();
  });

  it("calls onToggle with the server id", async () => {
    const onToggle = vi.fn();
    render(
      <StepConnectors
        connectors={[connector({ id: "linear", name: "Linear" })]}
        selected={[]}
        onToggle={onToggle}
      />,
    );
    await userEvent.click(screen.getByRole("switch", { name: "Linear" }));
    expect(onToggle).toHaveBeenCalledWith("linear");
  });
});
