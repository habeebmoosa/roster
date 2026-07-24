"use client";

import { useState } from "react";
import { CardDescription, CardTitle, Input, Textarea } from "@/ui";
import type { HireFormState } from "../types";

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function StepBasics({
  form,
  onChange,
}: {
  form: HireFormState;
  onChange: (fields: Partial<HireFormState>) => void;
}) {
  // Raw textarea text, kept separate from the parsed `expertise` array — deriving
  // the value from `expertise.join("\n")` on every keystroke would eat the
  // trailing newline the moment a user presses Enter to start a new line.
  const [expertiseText, setExpertiseText] = useState(form.expertise.join("\n"));

  function handleExpertiseChange(value: string) {
    setExpertiseText(value);
    onChange({ expertise: parseLines(value) });
  }

  return (
    <div>
      <CardTitle>Basic details</CardTitle>
      <CardDescription>
        This becomes the system prompt that shapes how the employee responds.
      </CardDescription>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-text font-medium">Name</span>
            <Input
              value={form.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Ada — Customer Support"
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-text font-medium">Role title</span>
            <Input
              value={form.role}
              onChange={(e) => onChange({ role: e.target.value })}
              placeholder="e.g. Customer Support Specialist"
              required
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">Identity</span>
          <Textarea
            value={form.identity}
            onChange={(e) => onChange({ identity: e.target.value })}
            placeholder="How this employee thinks and approaches problems."
            rows={3}
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">Voice</span>
          <Textarea
            value={form.voice}
            onChange={(e) => onChange({ voice: e.target.value })}
            placeholder="Tone and style — how this employee talks."
            rows={2}
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">Areas of expertise</span>
          <Textarea
            value={expertiseText}
            onChange={(e) => handleExpertiseChange(e.target.value)}
            placeholder={
              "One per line, e.g.\nDe-escalating frustrated customers\nExplaining refund policy"
            }
            rows={3}
          />
        </label>
      </div>
    </div>
  );
}
