// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddProviderForm } from "./add-provider-form";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

beforeEach(() => {
  refresh.mockClear();
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

describe("AddProviderForm", () => {
  it("wraps in a bordered Card by default (Settings context)", () => {
    const { container } = render(<AddProviderForm />);
    expect(container.firstElementChild?.tagName).toBe("DIV");
    expect(container.firstElementChild).toHaveClass("rounded-xl");
  });

  it("skips the Card wrapper when embedded (hire wizard context)", () => {
    const { container } = render(<AddProviderForm embedded />);
    expect(container.firstElementChild?.tagName).toBe("H3");
  });

  it("submits the selected provider, key, and model to /api/providers", async () => {
    mockFetchOnce(200, { ok: true });
    const user = userEvent.setup();
    render(<AddProviderForm />);

    await user.type(screen.getByLabelText("API key"), "sk-test-123");
    await user.click(screen.getByRole("button", { name: "Validate & save" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      "/api/providers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          provider: "openai",
          apiKey: "sk-test-123",
          model: "gpt-4o",
          baseUrl: undefined,
        }),
      }),
    );
  });

  it("shows an error message and does not refresh when the request fails", async () => {
    mockFetchOnce(400, { error: { message: "The API key was rejected." } });
    const user = userEvent.setup();
    render(<AddProviderForm />);

    await user.type(screen.getByLabelText("API key"), "sk-bad-key");
    await user.click(screen.getByRole("button", { name: "Validate & save" }));

    await waitFor(() => expect(screen.getByText("The API key was rejected.")).toBeInTheDocument());
    expect(refresh).not.toHaveBeenCalled();
  });

  it("marks the Base URL field required only for providers that require one", async () => {
    render(<AddProviderForm />);

    // OpenAI: base URL is editable but optional (its own hosted endpoint is the default).
    expect(screen.getByLabelText(/Base URL \(optional\)/)).not.toBeRequired();

    await userEvent.selectOptions(screen.getByLabelText("Provider"), "Custom (OpenAI-compatible)");
    expect(screen.getByLabelText(/Base URL \(required\)/)).toBeRequired();
  });
});
