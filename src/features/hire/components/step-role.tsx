import { CardDescription, CardTitle } from "@/ui";
import { cn } from "@/lib/cn";
import { ROLE_TEMPLATES } from "../fixtures";

export function StepRole({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <CardTitle>What role is this employee for?</CardTitle>
      <CardDescription>
        Start from one of Roster&apos;s launch roles, or build a custom one from scratch. You can
        edit everything in the next step.
      </CardDescription>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ROLE_TEMPLATES.map((template) => {
          const isCustom = template.id === "custom";
          const selected = selectedId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(template.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selected
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-bg-elevated hover:border-accent/50",
              )}
            >
              <p className="text-text text-sm font-semibold">
                {isCustom ? "Start from scratch" : template.name}
              </p>
              <p className="text-text-muted mt-1 text-sm">
                {isCustom ? "A blank employee with no starting persona." : template.role}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
