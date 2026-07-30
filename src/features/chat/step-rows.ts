import type { WorkflowStepEvent } from "@/core/workflow";

export interface StepRow {
  key: string;
  label: string;
  status: "running" | "done" | "failed";
}

/**
 * Turns a flat stream of Phase 8 step-boundary events into display rows: a
 * "step-start" opens a row (its own goal as the label); the matching
 * "step-complete" (same index) resolves it to done/failed; "rollback" appends
 * its own row. Events arrive in order but a step's start and complete are two
 * separate events, so this reduces them into one row per step by index.
 */
export function deriveStepRows(events: WorkflowStepEvent[]): StepRow[] {
  const rows: StepRow[] = [];
  const rowByIndex = new Map<number, StepRow>();

  for (const event of events) {
    if (event.type === "step-start") {
      const row: StepRow = { key: `step-${event.index}`, label: event.goal, status: "running" };
      rowByIndex.set(event.index, row);
      rows.push(row);
    } else if (event.type === "step-complete") {
      const row = rowByIndex.get(event.index);
      if (row) row.status = event.passed ? "done" : "failed";
    } else if (event.type === "rollback") {
      rows.push({
        key: "rollback",
        label: "Re-attempting as a single step",
        status: "running",
      });
    }
  }

  return rows;
}
