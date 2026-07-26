// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddCustomConnectorDialog } from "./add-custom-connector-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

describe("AddCustomConnectorDialog", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ server: { id: "acme-crm" } }) }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("submits the form to POST /api/mcp/servers", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddCustomConnectorDialog onClose={onClose} />);

    await user.type(screen.getByLabelText("Name"), "Acme CRM");
    await user.type(screen.getByLabelText("Description"), "Search Acme CRM contacts");
    await user.type(screen.getByLabelText("Connector URL"), "https://mcp.acme.example/mcp");
    await user.click(screen.getByRole("button", { name: "Add server" }));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/mcp/servers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Acme CRM",
          description: "Search Acme CRM contacts",
          connectorUrl: "https://mcp.acme.example/mcp",
          authType: "static_headers",
        }),
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddCustomConnectorDialog onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
