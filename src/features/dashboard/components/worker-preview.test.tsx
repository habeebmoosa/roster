// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorkerRow } from "@/features/workers";
import { WorkerPreview } from "./worker-preview";

const ROW: WorkerRow = {
  id: "customer-support",
  name: "Ada — Customer Support",
  role: "Customer Support Specialist",
  status: "active",
  model: "gpt-4o-mini",
  conversations30d: 12,
  lastActivity: "1h ago",
  spendUsd: 12,
};

describe("WorkerPreview", () => {
  it("renders a row's details", () => {
    render(<WorkerPreview rows={[ROW]} />);
    expect(screen.getByText("Ada — Customer Support")).toBeInTheDocument();
    expect(screen.getByText("Customer Support Specialist")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument();
    expect(screen.getByText("$12")).toBeInTheDocument();
  });

  it("links View all to /workers when there are rows", () => {
    render(<WorkerPreview rows={[ROW]} />);
    expect(screen.getByRole("link", { name: /View all/ })).toHaveAttribute("href", "/workers");
  });

  it("shows an empty state and no View all link when there are no employees", () => {
    render(<WorkerPreview rows={[]} />);
    expect(screen.getByText("No employees yet")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /View all/ })).not.toBeInTheDocument();
  });

  it("shows an honest 'Not configured' label, not a fake model, when none is set", () => {
    render(<WorkerPreview rows={[{ ...ROW, model: null }]} />);
    expect(screen.getByText("Not configured")).toBeInTheDocument();
    expect(screen.queryByText("gpt-4o-mini")).not.toBeInTheDocument();
  });

  it("shows a Paused badge for a paused agent", () => {
    render(<WorkerPreview rows={[{ ...ROW, status: "paused" }]} />);
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });
});
