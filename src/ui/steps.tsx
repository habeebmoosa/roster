import { cn } from "@/lib/cn";

export interface Step {
  n: number;
  label: string;
}

export type StepState = "done" | "active" | "upcoming";

export function stepState(stepNumber: number, current: number): StepState {
  if (stepNumber < current) return "done";
  if (stepNumber === current) return "active";
  return "upcoming";
}

/** Horizontal wizard stepper — e.g. the 6-step "Hire a new employee" flow. */
export function Steps({
  steps,
  current,
  className,
}: {
  steps: Step[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex items-center", className)}>
      {steps.map((step, i) => {
        const state = stepState(step.n, current);
        return (
          <li key={step.n} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  state === "done" && "bg-accent text-accent-contrast",
                  state === "active" && "border-accent text-accent border-2",
                  state === "upcoming" && "bg-bg-subtle text-text-faint",
                )}
              >
                {state === "done" ? "✓" : step.n}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  state === "upcoming" ? "text-text-faint" : "text-text",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 ? <span className="bg-border mx-3 h-px flex-1" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
