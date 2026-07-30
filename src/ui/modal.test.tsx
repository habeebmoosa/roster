// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./modal";

describe("Modal", () => {
  it("renders content only when open", () => {
    const { rerender } = render(
      <Modal open={false} onClose={() => {}} title="Create API key">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByText("Create API key")).not.toBeVisible();

    rerender(
      <Modal open={true} onClose={() => {}} title="Create API key">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByText("Create API key")).toBeVisible();
  });

  it("calls onClose when the dialog fires a close event (e.g. Escape)", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );

    fireEvent(document.querySelector("dialog")!, new Event("close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on a backdrop click (outside the dialog's box)", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );

    const dialog = document.querySelector("dialog")!;
    // jsdom lays out everything at 0x0, so getBoundingClientRect is all zeros —
    // any positive coordinate is reliably "outside".
    fireEvent.click(dialog, { clientX: 500, clientY: 500 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
