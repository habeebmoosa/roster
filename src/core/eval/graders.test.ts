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

  it("retrieval: passes when every expected source was retrieved", () => {
    const result = grade(
      "output",
      [
        {
          type: "retrieval",
          expectedSourceUris: ["kb://support-docs/refunds.md"],
          minRecall: 1,
          minPrecision: 0,
        },
      ],
      { retrievedSourceUris: ["kb://support-docs/refunds.md", "playbook://refund-flow"] },
    );
    expect(result.passed).toBe(true);
  });

  it("retrieval: fails and reports recall when an expected source is missing", () => {
    const result = grade(
      "output",
      [
        {
          type: "retrieval",
          expectedSourceUris: ["kb://support-docs/refunds.md"],
          minRecall: 1,
          minPrecision: 0,
        },
      ],
      { retrievedSourceUris: ["kb://support-docs/shipping.md"] },
    );
    expect(result.passed).toBe(false);
    expect(result.failures.join(" ")).toContain("recall");
    expect(result.failures.join(" ")).toContain("refunds.md");
  });

  it("retrieval: passes with no retrievedSourceUris context only if minRecall is 0", () => {
    const strict = grade(
      "output",
      [{ type: "retrieval", expectedSourceUris: ["a"], minRecall: 1, minPrecision: 0 }],
      {},
    );
    expect(strict.passed).toBe(false);

    const lenient = grade(
      "output",
      [{ type: "retrieval", expectedSourceUris: ["a"], minRecall: 0, minPrecision: 0 }],
      {},
    );
    expect(lenient.passed).toBe(true);
  });

  it("retrieval: partial recall passes only when it meets minRecall", () => {
    const context = { retrievedSourceUris: ["a"] };
    const graders = (minRecall: number) => [
      { type: "retrieval" as const, expectedSourceUris: ["a", "b"], minRecall, minPrecision: 0 },
    ];
    expect(grade("output", graders(0.5), context).passed).toBe(true); // 1/2 = 0.5
    expect(grade("output", graders(0.6), context).passed).toBe(false);
  });

  it("retrieval: fails and reports precision when too many irrelevant sources are retrieved", () => {
    const result = grade(
      "output",
      [
        {
          type: "retrieval",
          expectedSourceUris: ["a"],
          minRecall: 0,
          minPrecision: 0.5,
        },
      ],
      { retrievedSourceUris: ["a", "b", "c"] }, // precision = 1/3
    );
    expect(result.passed).toBe(false);
    expect(result.failures.join(" ")).toContain("precision");
  });
});
