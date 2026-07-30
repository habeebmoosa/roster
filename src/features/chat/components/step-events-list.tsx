import { cn } from "@/lib/cn";
import type { StepRow } from "../step-rows";

const STATUS_ICON: Record<StepRow["status"], string> = {
  running: "◌",
  done: "✓",
  failed: "!",
};

const STATUS_CLASSES: Record<StepRow["status"], string> = {
  running: "text-text-muted",
  done: "text-success",
  failed: "text-warning",
};

/** Live/replayed Phase 8 workflow steps, rendered above the assistant's reply. */
export function StepEventsList({ rows }: { rows: StepRow[] }) {
  if (rows.length === 0) return null;

  return (
    <ul className="mb-2 flex flex-col gap-1" data-testid="step-events-list">
      {rows.map((row) => (
        <li
          key={row.key}
          className={cn("flex items-center gap-1.5 text-xs", STATUS_CLASSES[row.status])}
        >
          <span aria-hidden="true" className={row.status === "running" ? "animate-pulse" : ""}>
            {STATUS_ICON[row.status]}
          </span>
          <span>{row.label}</span>
        </li>
      ))}
    </ul>
  );
}
