// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickActions } from "./quick-actions";

describe("QuickActions", () => {
  it("renders Open settings as a real link", () => {
    render(<QuickActions />);
    const link = screen.getByRole("link", { name: "Open settings" });
    expect(link).toHaveAttribute("href", "/settings");
  });

  it("does not render Hire/Connectors as links (not built yet)", () => {
    render(<QuickActions />);
    expect(screen.queryByRole("link", { name: /Hire an employee/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Add a connector/ })).not.toBeInTheDocument();
    expect(screen.getByText("Hire an employee")).toBeInTheDocument();
    expect(screen.getByText("Add a connector")).toBeInTheDocument();
  });
});
