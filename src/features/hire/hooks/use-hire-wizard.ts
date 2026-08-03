"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { slugify } from "@/lib/slugify";
import { ROLE_TEMPLATES } from "../fixtures";
import type { HireFormState } from "../types";

const STEP_COUNT = 7;
const DRAFT_KEY = "roster:hire-wizard-draft";

const EMPTY_FORM: HireFormState = {
  roleTemplateId: "",
  name: "",
  role: "",
  identity: "",
  voice: "",
  expertise: [],
  abilities: [],
  connectorIds: [],
  provider: "",
  model: "",
};

function readDraft(): { step: number; form: HireFormState } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { step: number; form: HireFormState };
  } catch {
    return null;
  }
}

export function useHireWizard(defaultProvider: string) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<HireFormState>({ ...EMPTY_FORM, provider: defaultProvider });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Resume an in-progress draft (from "Save & exit") on mount, client-side only.
  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setStep(draft.step);
      setForm(draft.form);
    }
    // Only ever restore once, on mount.
  }, []);

  const patch = useCallback((fields: Partial<HireFormState>) => {
    setForm((prev) => ({ ...prev, ...fields }));
  }, []);

  const applyTemplate = useCallback((templateId: string) => {
    setForm((prev) => {
      // Re-selecting the already-active template (e.g. Back then Continue without
      // changing anything) must not clobber edits made in later steps.
      if (prev.roleTemplateId === templateId) return prev;
      const template = ROLE_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return prev;
      return {
        ...prev,
        roleTemplateId: templateId,
        name: template.name,
        role: template.role,
        identity: template.identity,
        voice: template.voice,
        expertise: template.expertise,
        abilities: template.abilities,
      };
    });
  }, []);

  const toggleAbility = useCallback((abilityId: string) => {
    setForm((prev) => ({
      ...prev,
      abilities: prev.abilities.includes(abilityId)
        ? prev.abilities.filter((a) => a !== abilityId)
        : [...prev.abilities, abilityId],
    }));
  }, []);

  const toggleConnector = useCallback((serverId: string) => {
    setForm((prev) => ({
      ...prev,
      connectorIds: prev.connectorIds.includes(serverId)
        ? prev.connectorIds.filter((c) => c !== serverId)
        : [...prev.connectorIds, serverId],
    }));
  }, []);

  const canContinue = (() => {
    switch (step) {
      case 1:
        return form.roleTemplateId !== "";
      case 2:
        return (
          form.name.trim() !== "" &&
          form.role.trim() !== "" &&
          form.identity.trim() !== "" &&
          form.voice.trim() !== ""
        );
      case 6:
        return form.provider !== "" && form.model.trim() !== "";
      default:
        return true;
    }
  })();

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  function next() {
    if (!canContinue) return;
    setStep((s) => Math.min(STEP_COUNT, s + 1));
  }

  function saveAndExit() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, form }));
    }
  }

  async function submit(): Promise<{ ok: true; id: string } | { ok: false }> {
    setSubmitting(true);
    setSubmitError("");
    const id = slugify(form.name);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: form.name,
          role: form.role,
          identity: form.identity,
          voice: form.voice,
          expertise: form.expertise,
          abilities: form.abilities,
          model: { provider: form.provider, model: form.model },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data?.error?.message ?? "Failed to create employee.");
        setSubmitting(false);
        return { ok: false };
      }
      const agentId = data.id as string;

      // Best-effort: a connector failing to enable must not undo a
      // successfully-created employee. The user can always retry from the
      // employee's Connectors tab afterward.
      if (form.connectorIds.length > 0) {
        const results = await Promise.allSettled(
          form.connectorIds.map((serverId) =>
            fetch(`/api/agents/${agentId}/connectors/${serverId}`, { method: "POST" }),
          ),
        );
        const anyFailed = results.some((r) => r.status === "rejected" || !r.value.ok);
        if (anyFailed) {
          toast({
            title: "Employee created, but some connectors couldn't be enabled.",
            description: "Add them from the employee's Connectors tab.",
            variant: "danger",
          });
        }
      }

      if (typeof window !== "undefined") window.sessionStorage.removeItem(DRAFT_KEY);
      setSubmitting(false);
      return { ok: true, id: agentId };
    } catch {
      setSubmitError("Network error. Try again.");
      setSubmitting(false);
      return { ok: false };
    }
  }

  return {
    step,
    stepCount: STEP_COUNT,
    form,
    canContinue,
    submitting,
    submitError,
    patch,
    applyTemplate,
    toggleAbility,
    toggleConnector,
    back,
    next,
    saveAndExit,
    submit,
    generatedId: slugify(form.name),
  };
}
