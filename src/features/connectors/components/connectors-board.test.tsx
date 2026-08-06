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

    expect(screen.queryByText("Details")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("connector-notion"));
    expect(screen.getByText("Details")).toBeVisible();
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

  it("does not render a category filter when there are no connectors", () => {
    render(<ConnectorsBoard connectors={[]} />);
    expect(screen.queryByRole("button", { name: /Filter by/ })).not.toBeInTheDocument();
  });

  it("filters the grid to connectors matching a selected category", async () => {
    const user = userEvent.setup();
    render(
      <ConnectorsBoard
        connectors={[
          connector({ id: "notion", name: "Notion", categories: ["Docs"] }),
          connector({ id: "linear", name: "Linear", categories: ["Engineering"] }),
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter by" }));
    await user.click(screen.getByRole("menuitem", { name: "Engineering" }));

    expect(screen.getByText("Linear")).toBeInTheDocument();
    expect(screen.queryByText("Notion")).not.toBeInTheDocument();
  });

  it("selecting a new category replaces the previous filter rather than adding to it", async () => {
    const user = userEvent.setup();
    render(
      <ConnectorsBoard
        connectors={[
          connector({ id: "notion", name: "Notion", categories: ["Docs"] }),
          connector({ id: "linear", name: "Linear", categories: ["Engineering"] }),
          connector({ id: "figma", name: "Figma", categories: ["Docs", "Engineering"] }),
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter by" }));
    await user.click(screen.getByRole("menuitem", { name: "Docs" }));
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.getByText("Figma")).toBeInTheDocument();
    expect(screen.queryByText("Linear")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filter by: Docs" }));
    await user.click(screen.getByRole("menuitem", { name: "Engineering" }));
    expect(screen.getByText("Linear")).toBeInTheDocument();
    expect(screen.getByText("Figma")).toBeInTheDocument();
    expect(screen.queryByText("Notion")).not.toBeInTheDocument();
  });

  it("clicking All categories clears an active category filter", async () => {
    const user = userEvent.setup();
    render(
      <ConnectorsBoard
        connectors={[
          connector({ id: "notion", name: "Notion", categories: ["Docs"] }),
          connector({ id: "linear", name: "Linear", categories: ["Engineering"] }),
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter by" }));
    await user.click(screen.getByRole("menuitem", { name: "Engineering" }));
    expect(screen.queryByText("Notion")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filter by: Engineering" }));
    await user.click(screen.getByRole("menuitem", { name: "All categories" }));
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.getByText("Linear")).toBeInTheDocument();
  });
});
