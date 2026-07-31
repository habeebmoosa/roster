// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackDialog } from "./feedback-dialog";

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

describe("FeedbackDialog", () => {
  it("submits the typed message when open", async () => {
    mockFetchOnce(true);
    const user = userEvent.setup();
    render(<FeedbackDialog open onClose={() => {}} />);

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

  it("calls onClose without submitting on Cancel", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<FeedbackDialog open onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows an error message when the request fails", async () => {
    mockFetchOnce(false);
    const user = userEvent.setup();
    render(<FeedbackDialog open onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText("What's on your mind?"), "hi");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(screen.getByText("Couldn't send — try again.")).toBeInTheDocument());
    expect(toast).not.toHaveBeenCalled();
  });

  it("is not visible when closed", () => {
    render(<FeedbackDialog open={false} onClose={() => {}} />);
    expect(screen.getByPlaceholderText("What's on your mind?")).not.toBeVisible();
  });
});
