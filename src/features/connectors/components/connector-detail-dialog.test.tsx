// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Connector } from "../types";
import { ConnectorDetailDialog } from "./connector-detail-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...args: unknown[]) => toast(...args) }));

const NOTION: Connector = {
  id: "notion",
  name: "Notion",
  description: "Search Notion pages",
  iconUrl: null,
  developer: "Notion Labs, Inc.",
  connectorUrl: "https://mcp.notion.com/mcp",
  authType: "oauth_dcr",
  categories: ["Docs"],
  trustTier: "verified",
  cachedTools: [{ name: "search", description: "Search pages" }],
  cachedResources: [{ name: "page", description: "A page's content" }],
  documentationUrl: "https://developers.notion.com",
  supportUrl: null,
  privacyPolicyUrl: null,
  connected: false,
  connectionStatus: null,
};

const CUSTOM_HEADER_SERVER: Connector = {
  ...NOTION,
  id: "custom-crm",
  name: "Custom CRM",
  authType: "static_headers",
  trustTier: "custom",
};

describe("ConnectorDetailDialog", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows tools, resources, categories, and documentation link", () => {
    render(<ConnectorDetailDialog connector={NOTION} onClose={() => {}} />);
    expect(screen.getByText("search")).toBeInTheDocument();
    expect(screen.getByText("page")).toBeInTheDocument();
    expect(screen.getByText("Docs")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute(
      "href",
      "https://developers.notion.com",
    );
  });

  it("shows an OAuth Connect button that navigates to the start route", () => {
    render(<ConnectorDetailDialog connector={NOTION} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("submits header rows for a static_headers connector", async () => {
    const user = userEvent.setup();
    render(<ConnectorDetailDialog connector={CUSTOM_HEADER_SERVER} onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText("Header name (e.g. Authorization)"), "X-Api-Key");
    await user.type(screen.getByPlaceholderText("Value"), "secret-123");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/mcp/connections/custom-crm/manual",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ headers: { "X-Api-Key": "secret-123" } }),
      }),
    );
  });

  it("shows a Disconnect button when already connected", () => {
    render(<ConnectorDetailDialog connector={{ ...NOTION, connected: true }} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Connect" })).not.toBeInTheDocument();
  });
});
