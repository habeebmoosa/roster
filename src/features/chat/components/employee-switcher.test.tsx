// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AgentOption } from "../types";
import { EmployeeSwitcher } from "./employee-switcher";

const AGENTS: AgentOption[] = [
  { id: "customer-support", name: "Ada — Customer Support", role: "Support Specialist" },
  { id: "content-writer", name: "Milo — Content Writer", role: "Content Writer" },
];

describe("EmployeeSwitcher", () => {
  it("shows the current employee as the trigger", () => {
    render(<EmployeeSwitcher agents={AGENTS} currentId="customer-support" onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /Ada — Customer Support/ })).toBeInTheDocument();
  });

  it("lists every agent when opened, and selecting one calls onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<EmployeeSwitcher agents={AGENTS} currentId="customer-support" onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /Ada — Customer Support/ }));
    await user.click(screen.getByRole("menuitem", { name: /Milo — Content Writer/ }));

    expect(onSelect).toHaveBeenCalledWith("content-writer");
  });

  it("links Manage roster to /workers", async () => {
    const user = userEvent.setup();
    render(<EmployeeSwitcher agents={AGENTS} currentId="customer-support" onSelect={() => {}} />);

    await user.click(screen.getByRole("button", { name: /Ada — Customer Support/ }));
    expect(screen.getByRole("link", { name: "Manage roster" })).toHaveAttribute("href", "/workers");
  });
});
