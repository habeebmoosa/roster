// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StepRole } from "./step-role";

describe("StepRole", () => {
  it("renders every role template plus the custom option", () => {
    render(<StepRole selectedId="" onSelect={vi.fn()} />);
    expect(screen.getByText("Ada — Customer Support")).toBeInTheDocument();
    expect(screen.getAllByText("Content Writer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Start from scratch")).toBeInTheDocument();
  });

  it("marks the selected template as checked", () => {
    render(<StepRole selectedId="customer-support" onSelect={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /Ada — Customer Support/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("calls onSelect with the template id when clicked", async () => {
    const onSelect = vi.fn();
    render(<StepRole selectedId="" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("radio", { name: /Content Writer/ }));
    expect(onSelect).toHaveBeenCalledWith("content-writer");
  });
});
