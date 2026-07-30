// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WizardFooter } from "./wizard-footer";

describe("WizardFooter", () => {
  it("disables Back on the first step", () => {
    render(
      <WizardFooter
        step={1}
        stepCount={6}
        canContinue
        submitting={false}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        onSaveAndExit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("disables Continue when canContinue is false", () => {
    render(
      <WizardFooter
        step={2}
        stepCount={6}
        canContinue={false}
        submitting={false}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        onSaveAndExit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("labels the primary button 'Create employee' on the last step", () => {
    render(
      <WizardFooter
        step={6}
        stepCount={6}
        canContinue
        submitting={false}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        onSaveAndExit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Create employee" })).toBeInTheDocument();
  });

  it("shows a submitting label and disables navigation while submitting", () => {
    render(
      <WizardFooter
        step={6}
        stepCount={6}
        canContinue
        submitting={true}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        onSaveAndExit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save & exit" })).toBeDisabled();
  });

  it("calls onContinue/onBack/onSaveAndExit when clicked", async () => {
    const onBack = vi.fn();
    const onContinue = vi.fn();
    const onSaveAndExit = vi.fn();
    render(
      <WizardFooter
        step={2}
        stepCount={6}
        canContinue
        submitting={false}
        onBack={onBack}
        onContinue={onContinue}
        onSaveAndExit={onSaveAndExit}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "Save & exit" }));
    expect(onBack).toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalled();
    expect(onSaveAndExit).toHaveBeenCalled();
  });
});
