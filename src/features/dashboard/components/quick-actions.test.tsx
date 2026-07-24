// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickActions } from "./quick-actions";

describe("QuickActions", () => {
  it("renders all three actions as real links", () => {
    render(<QuickActions />);
    expect(screen.getByRole("link", { name: "Open settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.getByRole("link", { name: "Add a connector" })).toHaveAttribute(
      "href",
      "/connectors",
    );
    expect(screen.getByRole("link", { name: "Hire an employee" })).toHaveAttribute("href", "/hire");
  });
});
