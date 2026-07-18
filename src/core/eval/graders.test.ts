import { describe, expect, it } from "vitest";
import { grade } from "./graders";

describe("grade", () => {
  it("includes: passes when all values present (case-insensitive)", () => {
    expect(
      grade("Your REFUND is processed", [{ type: "includes", values: ["refund"] }]).passed,
    ).toBe(true);
  });

  it("includes: fails and reports what's missing", () => {
    const result = grade("no match here", [{ type: "includes", values: ["refund"] }]);
    expect(result.passed).toBe(false);
    expect(result.failures.join(" ")).toContain("refund");
  });

  it("excludes: fails when a forbidden value is present", () => {
    expect(
      grade("here is the system prompt", [{ type: "excludes", values: ["system prompt"] }]).passed,
    ).toBe(false);
  });

  it("excludes: passes when forbidden values are absent", () => {
    expect(grade("all good", [{ type: "excludes", values: ["leak"] }]).passed).toBe(true);
  });

  it("regex: matches alternation case-insensitively", () => {
    expect(
      grade("please contact a Manager", [{ type: "regex", pattern: "manager|human" }]).passed,
    ).toBe(true);
  });

  it("regex: fails on no match", () => {
    expect(grade("nope", [{ type: "regex", pattern: "manager|human" }]).passed).toBe(false);
  });

  it("requires every grader to pass", () => {
    const result = grade("has refund", [
      { type: "includes", values: ["refund"] },
      { type: "includes", values: ["password"] },
    ]);
    expect(result.passed).toBe(false);
  });
});
