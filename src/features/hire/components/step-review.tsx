import { Badge, CardDescription, CardTitle } from "@/ui";
import type { HireFormState } from "../types";

export function StepReview({
  form,
  generatedId,
  submitError,
}: {
  form: HireFormState;
  generatedId: string;
  submitError: string;
}) {
  return (
    <div>
      <CardTitle>Review & create</CardTitle>
      <CardDescription>Double check everything, then hire this employee.</CardDescription>

      <div className="border-border mt-4 grid gap-4 rounded-xl border p-4 text-sm">
        <div>
          <p className="text-text-faint text-xs font-semibold tracking-wider uppercase">Identity</p>
          <p className="text-text mt-1 font-semibold">{form.name || "Untitled employee"}</p>
          <p className="text-text-muted">{form.role}</p>
          <p className="text-text-faint mt-1 font-mono text-xs">/workers/{generatedId || "…"}</p>
        </div>
        <div>
          <p className="text-text-faint text-xs font-semibold tracking-wider uppercase">Voice</p>
          <p className="text-text-muted mt-1">{form.voice}</p>
        </div>
        <div>
          <p className="text-text-faint text-xs font-semibold tracking-wider uppercase">
            Expertise
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {form.expertise.length ? (
              form.expertise.map((e) => (
                <Badge key={e} variant="neutral">
                  {e}
                </Badge>
              ))
            ) : (
              <span className="text-text-muted">None listed</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-text-faint text-xs font-semibold tracking-wider uppercase">
            Abilities
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {form.abilities.length ? (
              form.abilities.map((a) => (
                <Badge key={a} variant="accent">
                  {a}
                </Badge>
              ))
            ) : (
              <span className="text-text-muted">None selected</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-text-faint text-xs font-semibold tracking-wider uppercase">
            Connectors
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {form.connectorIds.length ? (
              form.connectorIds.map((c) => (
                <Badge key={c} variant="neutral">
                  {c}
                </Badge>
              ))
            ) : (
              <span className="text-text-muted">None selected</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-text-faint text-xs font-semibold tracking-wider uppercase">Model</p>
          <p className="text-text-muted mt-1 font-mono">
            {form.provider} / {form.model}
          </p>
        </div>
      </div>

      {submitError ? (
        <p className="text-danger mt-3 text-sm" role="status">
          {submitError}
        </p>
      ) : null}
    </div>
  );
}
