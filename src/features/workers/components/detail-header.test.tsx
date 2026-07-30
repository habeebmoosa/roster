// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailHeader } from "./detail-header";

describe("DetailHeader", () => {
  it("renders the name, role, and status", () => {
    render(
      <DetailHeader
        name="Ada — Customer Support"
        role="Customer Support Specialist"
        status="Active"
      />,
    );
    expect(screen.getByRole("heading", { name: "Ada — Customer Support" })).toBeInTheDocument();
    expect(screen.getByText("Customer Support Specialist")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders Pause/Edit as non-interactive (no pause/edit flow exists yet)", () => {
    render(<DetailHeader name="Ada" role="Support" status="Active" />);
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByText("Pause")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });
});
