// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DetailHeader } from "./detail-header";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...args: unknown[]) => toast(...args) }));

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

describe("DetailHeader", () => {
  it("renders the name, role, and an Active badge", () => {
    render(
      <DetailHeader
        agentId="customer-support"
        name="Ada — Customer Support"
        role="Customer Support Specialist"
        status="active"
      />,
    );
    expect(screen.getByRole("heading", { name: "Ada — Customer Support" })).toBeInTheDocument();
    expect(screen.getByText("Customer Support Specialist")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("renders a Paused badge and a Resume button when paused", () => {
    render(<DetailHeader agentId="customer-support" name="Ada" role="Support" status="paused" />);
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
  });

  it("pauses an active employee via PATCH, then toasts and refreshes", async () => {
    mockFetchOnce(200, { ok: true, status: "paused" });
    const user = userEvent.setup();
    render(<DetailHeader agentId="customer-support" name="Ada" role="Support" status="active" />);

    await user.click(screen.getByRole("button", { name: "Pause" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      "/api/agents/customer-support/status",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "paused" }) }),
    );
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
  });

  it("resumes a paused employee via PATCH", async () => {
    mockFetchOnce(200, { ok: true, status: "active" });
    const user = userEvent.setup();
    render(<DetailHeader agentId="customer-support" name="Ada" role="Support" status="paused" />);

    await user.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      "/api/agents/customer-support/status",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "active" }) }),
    );
  });

  it("shows an error toast and does not refresh when the request fails", async () => {
    mockFetchOnce(500, { error: { message: "Something went wrong." } });
    const user = userEvent.setup();
    render(<DetailHeader agentId="customer-support" name="Ada" role="Support" status="active" />);

    await user.click(screen.getByRole("button", { name: "Pause" }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Something went wrong.", variant: "danger" }),
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renders Edit as non-interactive (no edit-agent flow exists yet)", () => {
    render(<DetailHeader agentId="customer-support" name="Ada" role="Support" status="active" />);
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });
});
