// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Connector } from "../types";
import { ConnectorCard } from "./connector-card";

const NOTION: Connector = {
  id: "notion",
  name: "Notion",
  description: "Search, read, and update Notion pages and databases",
  iconUrl: null,
  developer: "Notion Labs, Inc.",
  connectorUrl: "https://mcp.notion.com/mcp",
  authType: "oauth_dcr",
  categories: ["Productivity", "Docs"],
  trustTier: "verified",
  cachedTools: [{ name: "search", description: "Search pages" }],
  cachedResources: [],
  documentationUrl: null,
  supportUrl: null,
  privacyPolicyUrl: null,
  connected: false,
  connectionStatus: null,
};

describe("ConnectorCard", () => {
  it("shows name, description, categories, and trust badge", () => {
    render(<ConnectorCard connector={NOTION} onOpen={() => {}} />);
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.getByText(NOTION.description)).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Productivity · Docs")).toBeInTheDocument();
  });

  it("shows a Connected badge only when connected", () => {
    const { rerender } = render(<ConnectorCard connector={NOTION} onOpen={() => {}} />);
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();

    rerender(<ConnectorCard connector={{ ...NOTION, connected: true }} onOpen={() => {}} />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("shows the initial-letter badge when there is no iconUrl", () => {
    const { container } = render(<ConnectorCard connector={NOTION} onOpen={() => {}} />);
    expect(screen.getByText("N")).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("renders the vendor icon instead of the initial-letter badge when iconUrl is set", () => {
    const { container } = render(
      <ConnectorCard
        connector={{ ...NOTION, iconUrl: "/connector-logos/notion.svg" }}
        onOpen={() => {}}
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "/connector-logos/notion.svg");
    expect(screen.queryByText("N")).not.toBeInTheDocument();
  });

  it("calls onOpen when the card is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<ConnectorCard connector={NOTION} onOpen={onOpen} />);
    await user.click(screen.getByTestId("connector-notion"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("calls onOpen on Enter/Space for keyboard accessibility", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<ConnectorCard connector={NOTION} onOpen={onOpen} />);
    const card = screen.getByTestId("connector-notion");
    card.focus();
    await user.keyboard("{Enter}");
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
