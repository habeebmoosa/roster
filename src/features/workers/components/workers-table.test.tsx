// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorkerRow } from "../types";
import { WorkersTable } from "./workers-table";

const ROW: WorkerRow = {
  id: "customer-support",
  name: "Ada — Customer Support",
  role: "Customer Support Specialist",
  status: "Active",
  model: "gemini-2.0-flash",
  conversations30d: 42,
  lastActivity: "12m ago",
  spendUsd: 36,
};

describe("WorkersTable", () => {
  it("renders every column for a row", () => {
    render(<WorkersTable rows={[ROW]} />);
    expect(screen.getByText("Ada — Customer Support")).toBeInTheDocument();
    expect(screen.getByText("Customer Support Specialist")).toBeInTheDocument();
    // "Active" appears twice: the status badge and the "Active" (last-active) column header.
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("gemini-2.0-flash")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("12m ago")).toBeInTheDocument();
    expect(screen.getByText("$36")).toBeInTheDocument();
  });

  it("shows an empty state when there are no rows", () => {
    render(<WorkersTable rows={[]} />);
    expect(screen.getByText("No workers found")).toBeInTheDocument();
  });

  it("links a row to its employee detail page", () => {
    render(<WorkersTable rows={[ROW]} />);
    expect(screen.getByRole("link", { name: /Ada — Customer Support/ })).toHaveAttribute(
      "href",
      "/workers/customer-support",
    );
  });
});
