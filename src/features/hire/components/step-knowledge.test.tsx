// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepKnowledge } from "./step-knowledge";

describe("StepKnowledge", () => {
  it("renders as an informational, disabled fixture step", () => {
    render(<StepKnowledge />);
    expect(screen.getByText("No knowledge sources yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload files" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Connect a source" })).toBeDisabled();
  });
});
