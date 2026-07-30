// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BillingTab } from "./billing-tab";

describe("BillingTab", () => {
  it("shows the current plan and payment method state", () => {
    render(<BillingTab />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("No payment method on file.")).toBeInTheDocument();
  });

  it("renders billing history rows", () => {
    render(<BillingTab />);
    expect(screen.getByText("INV-0001")).toBeInTheDocument();
    expect(screen.getByText("INV-0002")).toBeInTheDocument();
  });

  it("disables Upgrade plan and Add payment method (not wired up yet)", () => {
    render(<BillingTab />);
    expect(screen.getByRole("button", { name: "Upgrade plan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add payment method" })).toBeDisabled();
  });
});
