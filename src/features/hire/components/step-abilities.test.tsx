// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StepAbilities } from "./step-abilities";

describe("StepAbilities", () => {
  it("renders every ability in the catalog", () => {
    render(<StepAbilities selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByText("Knowledge base lookup")).toBeInTheDocument();
    expect(screen.getByText("Web search")).toBeInTheDocument();
  });

  it("reflects selected abilities as checked switches", () => {
    render(<StepAbilities selected={["kb_lookup"]} onToggle={vi.fn()} />);
    expect(screen.getByRole("switch", { name: "Knowledge base lookup" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("switch", { name: "Web search" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("calls onToggle with the ability id", async () => {
    const onToggle = vi.fn();
    render(<StepAbilities selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("switch", { name: "Web search" }));
    expect(onToggle).toHaveBeenCalledWith("web_search");
  });
});
