import { Button } from "@/ui";

export function WizardFooter({
  step,
  stepCount,
  canContinue,
  submitting,
  onBack,
  onContinue,
  onSaveAndExit,
}: {
  step: number;
  stepCount: number;
  canContinue: boolean;
  submitting: boolean;
  onBack: () => void;
  onContinue: () => void;
  onSaveAndExit: () => void;
}) {
  const isLastStep = step === stepCount;

  return (
    <div className="border-border mt-6 flex items-center justify-between border-t pt-4">
      <Button variant="secondary" onClick={onBack} disabled={step === 1 || submitting}>
        Back
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onSaveAndExit} disabled={submitting}>
          Save & exit
        </Button>
        <Button onClick={onContinue} disabled={!canContinue || submitting}>
          {isLastStep ? (submitting ? "Creating…" : "Create employee") : "Continue"}
        </Button>
      </div>
    </div>
  );
}
