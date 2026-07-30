// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { HireFormState } from "../types";
import { StepBasics } from "./step-basics";

const BASE_FORM: HireFormState = {
  roleTemplateId: "custom",
  name: "",
  role: "",
  identity: "",
  voice: "",
  expertise: [],
  abilities: [],
  provider: "",
  model: "",
};

describe("StepBasics", () => {
  it("calls onChange with the typed name", async () => {
    const onChange = vi.fn();
    render(<StepBasics form={BASE_FORM} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Name"), "A");
    expect(onChange).toHaveBeenCalledWith({ name: "A" });
  });

  it("lets a user type a newline in the expertise textarea without it being eaten", async () => {
    const onChange = vi.fn();
    render(<StepBasics form={BASE_FORM} onChange={onChange} />);
    const textarea = screen.getByLabelText("Areas of expertise");

    await userEvent.type(textarea, "First{enter}Second");

    expect(textarea).toHaveValue("First\nSecond");
    // The parsed array (last onChange call) drops the blank trailing line, but the
    // visible textarea text above must have kept the newline — that's the bug this guards.
    expect(onChange).toHaveBeenLastCalledWith({ expertise: ["First", "Second"] });
  });

  it("seeds the expertise textarea from the initial form value", () => {
    render(
      <StepBasics
        form={{ ...BASE_FORM, expertise: ["De-escalation", "Refunds"] }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Areas of expertise")).toHaveValue("De-escalation\nRefunds");
  });
});
