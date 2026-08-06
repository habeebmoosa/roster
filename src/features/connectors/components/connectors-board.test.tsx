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
  it("renders every built-in connector as a card on the default Built-in tab", () => {
    render(
      <ConnectorsBoard connectors={[connector(), connector({ id: "linear", name: "Linear" })]} />,
    );
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.getByText("Linear")).toBeInTheDocument();
  });

  it("shows Built-in and Custom tabs with a count of each", () => {
    render(
      <ConnectorsBoard
        connectors={[
          connector({ id: "notion", trustTier: "verified" }),
          connector({ id: "linear", trustTier: "community" }),
          connector({ id: "acme", trustTier: "custom" }),
        ]}
      />,
    );
    expect(screen.getByRole("tab", { name: "Built-in (2)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Custom (1)" })).toBeInTheDocument();
  });

  it("hides custom connectors from the Built-in tab and vice versa", async () => {
    const user = userEvent.setup();
    render(
      <ConnectorsBoard
        connectors={[
          connector({ id: "notion", name: "Notion", trustTier: "verified" }),
          connector({ id: "acme", name: "Acme Server", trustTier: "custom" }),
        ]}
      />,
    );

    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.queryByText("Acme Server")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Custom (1)" }));
    expect(screen.getByText("Acme Server")).toBeInTheDocument();
    expect(screen.queryByText("Notion")).not.toBeInTheDocument();
  });

  it("opens the detail dialog for a connector when its card is clicked", async () => {
    const user = userEvent.setup();
    render(<ConnectorsBoard connectors={[connector()]} />);

    expect(screen.queryByText("Details")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("connector-notion"));
    expect(screen.getByText("Details")).toBeVisible();
  });

  it("opens the add-custom-connector dialog from the Custom tab's empty state", async () => {
    const user = userEvent.setup();
    render(<ConnectorsBoard connectors={[connector()]} />);

    await user.click(screen.getByRole("tab", { name: "Custom (0)" }));
    await user.click(screen.getByRole("button", { name: "+ Add custom connector" }));
    expect(screen.getByText("Add a custom MCP server")).toBeInTheDocument();
  });

  it("opens the add-custom-connector dialog from the Custom tab's toolbar once custom connectors exist", async () => {
    const user = userEvent.setup();
    render(
      <ConnectorsBoard connectors={[connector({ id: "acme", trustTier: "custom" })]} />,
    );

    await user.click(screen.getByRole("tab", { name: "Custom (1)" }));
    await user.click(screen.getByRole("button", { name: "+ Add custom connector" }));
    expect(screen.getByText("Add a custom MCP server")).toBeInTheDocument();
  });

  it("shows an empty state instead of a bare grid when there are no connectors", () => {
    render(<ConnectorsBoard connectors={[]} />);
    expect(screen.getByText("No connectors available")).toBeInTheDocument();
  });

  it("shows an empty state on the Custom tab when there are no custom connectors", async () => {
    const user = userEvent.setup();
    render(<ConnectorsBoard connectors={[connector()]} />);

    await user.click(screen.getByRole("tab", { name: "Custom (0)" }));
    expect(screen.getByText("No custom connectors yet")).toBeInTheDocument();
  });

  it("does not render a category filter when there are no connectors", () => {
    render(<ConnectorsBoard connectors={[]} />);
    expect(screen.queryByRole("button", { name: /Filter by/ })).not.toBeInTheDocument();
  });

  it("does not render a category filter on the Custom tab", async () => {
    const user = userEvent.setup();
    render(
      <ConnectorsBoard
        connectors={[
          connector({ id: "notion", categories: ["Docs"] }),
          connector({ id: "acme", trustTier: "custom", categories: ["Testing"] }),
        ]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Custom (1)" }));
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

  it("category options on the Built-in tab are derived only from built-in connectors", async () => {
    const user = userEvent.setup();
    render(
      <ConnectorsBoard
        connectors={[
          connector({ id: "notion", categories: ["Docs"] }),
          connector({ id: "acme", trustTier: "custom", categories: ["Testing"] }),
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter by" }));
    expect(screen.getByRole("menuitem", { name: "Docs" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Testing" })).not.toBeInTheDocument();
  });
});
