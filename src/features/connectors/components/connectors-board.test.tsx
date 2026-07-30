// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Connector } from "../types";
import { ConnectorsBoard } from "./connectors-board";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

function connector(overrides: Partial<Connector> = {}): Connector {
  return {
    id: "notion",
    name: "Notion",
    description: "Search Notion pages",
    iconUrl: null,
    developer: "Notion Labs, Inc.",
    connectorUrl: "https://mcp.notion.com/mcp",
    authType: "oauth_dcr",
    categories: ["Docs"],
    trustTier: "verified",
    cachedTools: [],
    cachedResources: [],
    documentationUrl: null,
    supportUrl: null,
    privacyPolicyUrl: null,
    connected: false,
    connectionStatus: null,
    ...overrides,
  };
}

describe("ConnectorsBoard", () => {
  it("renders every connector as a card", () => {
    render(
      <ConnectorsBoard connectors={[connector(), connector({ id: "linear", name: "Linear" })]} />,
    );
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.getByText("Linear")).toBeInTheDocument();
  });

  it("opens the detail dialog for a connector when its card is clicked", async () => {
    const user = userEvent.setup();
    render(<ConnectorsBoard connectors={[connector()]} />);

    expect(screen.queryByText("Example prompts")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("connector-notion"));
    expect(screen.getByText("Example prompts")).toBeVisible();
  });

  it("opens the add-custom-connector dialog from the header button", async () => {
    const user = userEvent.setup();
    render(<ConnectorsBoard connectors={[connector()]} />);

    await user.click(screen.getByRole("button", { name: "+ Add custom connector" }));
    expect(screen.getByText("Add a custom MCP server")).toBeInTheDocument();
  });

  it("shows an empty state instead of a bare grid when there are no connectors", () => {
    render(<ConnectorsBoard connectors={[]} />);
    expect(screen.getByText("No connectors available")).toBeInTheDocument();
  });
});
