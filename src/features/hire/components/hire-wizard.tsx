"use client";

import { useRouter } from "next/navigation";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { Card, Steps } from "@/ui";
import { useHireWizard } from "../hooks/use-hire-wizard";
import { StepAbilities } from "./step-abilities";
import { StepBasics } from "./step-basics";
import { StepKnowledge } from "./step-knowledge";
import { StepModel } from "./step-model";
import { StepReview } from "./step-review";
import { StepRole } from "./step-role";
import { WizardFooter } from "./wizard-footer";

const STEPS = [
  { n: 1, label: "Role" },
  { n: 2, label: "Basics" },
  { n: 3, label: "Knowledge" },
  { n: 4, label: "Abilities" },
  { n: 5, label: "Model" },
  { n: 6, label: "Review" },
];

export function HireWizard({ providerKeys }: { providerKeys: ProviderKeyRecord[] }) {
  const router = useRouter();
  const wizard = useHireWizard(providerKeys[0]?.provider ?? "");

  async function handleContinue() {
    if (wizard.step < wizard.stepCount) {
      wizard.next();
      return;
    }
    const result = await wizard.submit();
    if (result.ok) router.push(`/workers/${result.id}`);
  }

  function handleSaveAndExit() {
    wizard.saveAndExit();
    router.push("/workers");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Steps steps={STEPS} current={wizard.step} />

      <Card className="mt-6">
        {wizard.step === 1 ? (
          <StepRole selectedId={wizard.form.roleTemplateId} onSelect={wizard.applyTemplate} />
        ) : null}
        {wizard.step === 2 ? <StepBasics form={wizard.form} onChange={wizard.patch} /> : null}
        {wizard.step === 3 ? <StepKnowledge /> : null}
        {wizard.step === 4 ? (
          <StepAbilities selected={wizard.form.abilities} onToggle={wizard.toggleAbility} />
        ) : null}
        {wizard.step === 5 ? (
          <StepModel
            providerKeys={providerKeys}
            provider={wizard.form.provider}
            model={wizard.form.model}
            onChange={wizard.patch}
          />
        ) : null}
        {wizard.step === 6 ? (
          <StepReview
            form={wizard.form}
            generatedId={wizard.generatedId}
            submitError={wizard.submitError}
          />
        ) : null}

        <WizardFooter
          step={wizard.step}
          stepCount={wizard.stepCount}
          canContinue={wizard.canContinue}
          submitting={wizard.submitting}
          onBack={wizard.back}
          onContinue={handleContinue}
          onSaveAndExit={handleSaveAndExit}
        />
      </Card>
    </div>
  );
}
