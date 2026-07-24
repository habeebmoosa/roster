// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HireFormState } from "../types";
import { StepReview } from "./step-review";

const FORM: HireFormState = {
  roleTemplateId: "custom",
  name: "Bo Ops",
  role: "Team Organizer",
  identity: "Keeps things moving.",
  voice: "Brisk.",
  expertise: ["Scheduling"],
  abilities: ["draft_reply"],
  provider: "openai",
  model: "gpt-4o-mini",
};

describe("StepReview", () => {
  it("summarizes the form, including the generated id and model", () => {
    render(<StepReview form={FORM} generatedId="bo-ops" submitError="" />);
    expect(screen.getByText("Bo Ops")).toBeInTheDocument();
    expect(screen.getByText("/workers/bo-ops")).toBeInTheDocument();
    expect(screen.getByText("Scheduling")).toBeInTheDocument();
    expect(screen.getByText("draft_reply")).toBeInTheDocument();
    expect(screen.getByText("openai / gpt-4o-mini")).toBeInTheDocument();
  });

  it("shows placeholders when expertise/abilities are empty", () => {
    render(
      <StepReview
        form={{ ...FORM, expertise: [], abilities: [] }}
        generatedId="bo-ops"
        submitError=""
      />,
    );
    expect(screen.getByText("None listed")).toBeInTheDocument();
    expect(screen.getByText("None selected")).toBeInTheDocument();
  });

  it("surfaces a submit error", () => {
    render(<StepReview form={FORM} generatedId="bo-ops" submitError="Already exists." />);
    expect(screen.getByRole("status")).toHaveTextContent("Already exists.");
  });
});
