// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackButton } from "./feedback-button";

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...args: unknown[]) => toast(...args) }));

beforeEach(() => {
  toast.mockClear();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchOnce(ok: boolean) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok });
}

describe("FeedbackButton", () => {
  it("opens the modal and submits the typed message", async () => {
    mockFetchOnce(true);
    const user = userEvent.setup();
    render(<FeedbackButton />);

    await user.click(screen.getByRole("button", { name: "Feedback" }));
    await user.type(screen.getByPlaceholderText("What's on your mind?"), "Love the product!");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Thanks for the feedback!" }),
      ),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/feedback",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ message: "Love the product!" }),
      }),
    );
  });

  it("closes without submitting on Cancel", async () => {
    const user = userEvent.setup();
    render(<FeedbackButton />);

    await user.click(screen.getByRole("button", { name: "Feedback" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows an error message when the request fails", async () => {
    mockFetchOnce(false);
    const user = userEvent.setup();
    render(<FeedbackButton />);

    await user.click(screen.getByRole("button", { name: "Feedback" }));
    await user.type(screen.getByPlaceholderText("What's on your mind?"), "hi");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(screen.getByText("Couldn't send — try again.")).toBeInTheDocument());
    expect(toast).not.toHaveBeenCalled();
  });
});
