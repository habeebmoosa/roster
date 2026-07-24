// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickActions } from "./quick-actions";

describe("QuickActions", () => {
  it("renders Open settings and Add a connector as real links", () => {
    render(<QuickActions />);
    expect(screen.getByRole("link", { name: "Open settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.getByRole("link", { name: "Add a connector" })).toHaveAttribute(
      "href",
      "/connectors",
    );
  });

  it("does not render Hire as a link (not built yet)", () => {
    render(<QuickActions />);
    expect(screen.queryByRole("link", { name: /Hire an employee/ })).not.toBeInTheDocument();
    expect(screen.getByText("Hire an employee")).toBeInTheDocument();
  });
});
