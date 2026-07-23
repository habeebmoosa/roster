// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RosterPreviewRow } from "../types";
import { RosterPreview } from "./roster-preview";

const ROW: RosterPreviewRow = {
  id: "customer-support",
  name: "Ada — Customer Support",
  role: "Customer Support Specialist",
  status: "Active",
  model: "gpt-4o-mini",
  lastActivity: "1h ago",
  spendUsd: 12,
};

describe("RosterPreview", () => {
  it("renders a row's details", () => {
    render(<RosterPreview rows={[ROW]} />);
    expect(screen.getByText("Ada — Customer Support")).toBeInTheDocument();
    expect(screen.getByText("Customer Support Specialist")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument();
    expect(screen.getByText("$12")).toBeInTheDocument();
  });

  it("shows an empty state when there are no employees", () => {
    render(<RosterPreview rows={[]} />);
    expect(screen.getByText("No employees yet")).toBeInTheDocument();
  });
});
