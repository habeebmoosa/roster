// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateApiKeyForm } from "./create-api-key-form";

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

describe("CreateApiKeyForm", () => {
  it("opens the create modal, then shows the raw key once on success", async () => {
    mockFetchOnce(200, { key: { id: "key-1" }, rawKey: "rk_live_abc123" });
    const user = userEvent.setup();
    render(<CreateApiKeyForm />);

    await user.click(screen.getByRole("button", { name: "+ Create API key" }));
    await user.type(screen.getByPlaceholderText("e.g. Production"), "Staging");
    await user.click(screen.getByRole("button", { name: "Create key" }));

    await waitFor(() => expect(screen.getByText("rk_live_abc123")).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(
      "/api/api-keys",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ label: "Staging" }),
      }),
    );
  });

  it("refreshes the router once the raw-key modal is dismissed", async () => {
    mockFetchOnce(200, { key: { id: "key-1" }, rawKey: "rk_live_abc123" });
    const user = userEvent.setup();
    render(<CreateApiKeyForm />);

    await user.click(screen.getByRole("button", { name: "+ Create API key" }));
    await user.click(screen.getByRole("button", { name: "Create key" }));
    await waitFor(() => expect(screen.getByText("rk_live_abc123")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh the router when the create modal is cancelled without creating a key", async () => {
    const user = userEvent.setup();
    render(<CreateApiKeyForm />);

    await user.click(screen.getByRole("button", { name: "+ Create API key" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("copies the raw key and shows a toast", async () => {
    mockFetchOnce(200, { key: { id: "key-1" }, rawKey: "rk_live_abc123" });
    // user-event installs its own Clipboard stub during setup() — define ours
    // afterward so it isn't clobbered.
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<CreateApiKeyForm />);

    await user.click(screen.getByRole("button", { name: "+ Create API key" }));
    await user.click(screen.getByRole("button", { name: "Create key" }));
    await waitFor(() => expect(screen.getByText("rk_live_abc123")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("rk_live_abc123"));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Copied to clipboard" }));
  });

  it("shows an error message when the request fails, without ever showing a raw key", async () => {
    mockFetchOnce(400, { error: { message: "Something went wrong." } });
    const user = userEvent.setup();
    render(<CreateApiKeyForm />);

    await user.click(screen.getByRole("button", { name: "+ Create API key" }));
    await user.click(screen.getByRole("button", { name: "Create key" }));

    await waitFor(() => expect(screen.getByText("Something went wrong.")).toBeInTheDocument());
    expect(screen.queryByText(/rk_live_/)).not.toBeInTheDocument();
  });
});
