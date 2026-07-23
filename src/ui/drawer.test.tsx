// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "./drawer";

describe("Drawer", () => {
  it("is aria-hidden when closed and not when open", () => {
    const { rerender } = render(
      <Drawer open={false} onClose={() => {}} title="History">
        <p>Panel content</p>
      </Drawer>,
    );
    expect(screen.getByText("Panel content").closest("[aria-hidden]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    rerender(
      <Drawer open={true} onClose={() => {}} title="History">
        <p>Panel content</p>
      </Drawer>,
    );
    expect(screen.getByText("Panel content").closest("[aria-hidden]")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose} title="History">
        <p>Panel content</p>
      </Drawer>,
    );

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape while open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose}>
        <p>Panel content</p>
      </Drawer>,
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not listen for Escape while closed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer open={false} onClose={onClose}>
        <p>Panel content</p>
      </Drawer>,
    );

    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });
});
