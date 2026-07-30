import { describe, expect, it } from "vitest";
import { dateTimeMath } from "./date-math";
import { callTool } from "./test-helpers";

function run(input: Parameters<NonNullable<typeof dateTimeMath.execute>>[0]) {
  return callTool(dateTimeMath, input);
}

describe("dateTimeMath tool", () => {
  it("adds a duration to a date", async () => {
    const result = await run({
      operation: "add",
      date: "2026-07-26T00:00:00Z",
      amount: 5,
      unit: "days",
    });
    expect(result.result).toBe("2026-07-31T00:00:00.000Z");
  });

  it("subtracts a duration from a date", async () => {
    const result = await run({
      operation: "subtract",
      date: "2026-07-26T00:00:00Z",
      amount: 1,
      unit: "months",
    });
    expect(result.result).toBe("2026-06-26T00:00:00.000Z");
  });

  it("computes the difference between two dates in a given unit", async () => {
    const result = await run({
      operation: "diff",
      date: "2026-07-01T00:00:00Z",
      otherDate: "2026-07-26T00:00:00Z",
      unit: "days",
    });
    expect(result.result).toBe(25);
  });

  it("converts a date to another timezone", async () => {
    const result = await run({
      operation: "convertTimezone",
      date: "2026-07-26T12:00:00Z",
      timezone: "America/New_York",
    });
    expect(result.result).toBe("2026-07-26T08:00:00.000-04:00");
  });

  it("rejects invalid dates", async () => {
    await expect(
      run({ operation: "add", date: "not-a-date", amount: 1, unit: "days" }),
    ).rejects.toThrow(/invalid date/i);
  });

  it("rejects add/subtract missing amount or unit", async () => {
    await expect(run({ operation: "add", date: "2026-07-26T00:00:00Z" })).rejects.toThrow(
      /requires 'amount' and 'unit'/,
    );
  });

  it("rejects diff missing otherDate", async () => {
    await expect(
      run({ operation: "diff", date: "2026-07-26T00:00:00Z", unit: "days" }),
    ).rejects.toThrow(/requires 'otherDate' and 'unit'/);
  });

  it("rejects convertTimezone missing timezone", async () => {
    await expect(
      run({ operation: "convertTimezone", date: "2026-07-26T00:00:00Z" }),
    ).rejects.toThrow(/requires 'timezone'/);
  });
});
