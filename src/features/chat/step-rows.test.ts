import { describe, expect, it } from "vitest";
import type { WorkflowStepEvent } from "@/core/workflow";
import { deriveStepRows } from "./step-rows";

describe("deriveStepRows", () => {
  it("returns nothing for no events", () => {
    expect(deriveStepRows([])).toEqual([]);
  });

  it("shows a running row once a step starts, before it completes", () => {
    const events: WorkflowStepEvent[] = [
      { type: "step-start", index: 1, goal: "Look up the order" },
    ];
    expect(deriveStepRows(events)).toEqual([
      { key: "step-1", label: "Look up the order", status: "running" },
    ]);
  });

  it("resolves a row to done when its matching step-complete passes", () => {
    const events: WorkflowStepEvent[] = [
      { type: "step-start", index: 1, goal: "Look up the order" },
      { type: "step-complete", index: 1, passed: true, attempts: 1 },
    ];
    expect(deriveStepRows(events)).toEqual([
      { key: "step-1", label: "Look up the order", status: "done" },
    ]);
  });

  it("resolves a row to failed when its matching step-complete does not pass", () => {
    const events: WorkflowStepEvent[] = [
      { type: "step-start", index: 1, goal: "Look up the order" },
      { type: "step-complete", index: 1, passed: false, attempts: 2 },
    ];
    expect(deriveStepRows(events)).toEqual([
      { key: "step-1", label: "Look up the order", status: "failed" },
    ]);
  });

  it("tracks multiple steps by index independently, in order", () => {
    const events: WorkflowStepEvent[] = [
      { type: "step-start", index: 1, goal: "Step one" },
      { type: "step-complete", index: 1, passed: true, attempts: 1 },
      { type: "step-start", index: 2, goal: "Step two" },
    ];
    expect(deriveStepRows(events)).toEqual([
      { key: "step-1", label: "Step one", status: "done" },
      { key: "step-2", label: "Step two", status: "running" },
    ]);
  });

  it("appends a rollback row", () => {
    const events: WorkflowStepEvent[] = [
      { type: "step-start", index: 1, goal: "Step one" },
      { type: "step-complete", index: 1, passed: false, attempts: 2 },
      { type: "rollback" },
    ];
    expect(deriveStepRows(events)).toEqual([
      { key: "step-1", label: "Step one", status: "failed" },
      { key: "rollback", label: "Re-attempting as a single step", status: "running" },
    ]);
  });

  it("ignores a step-complete with no matching step-start", () => {
    const events: WorkflowStepEvent[] = [
      { type: "step-complete", index: 5, passed: true, attempts: 1 },
    ];
    expect(deriveStepRows(events)).toEqual([]);
  });
});
