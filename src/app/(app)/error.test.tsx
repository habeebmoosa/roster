// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppError from "./error";

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

describe("AppError boundary", () => {
  it("reports the error to Sentry on mount", () => {
    const error = new Error("boom");
    render(<AppError error={error} reset={vi.fn()} />);
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("calls reset when the user retries", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<AppError error={new Error("boom")} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
