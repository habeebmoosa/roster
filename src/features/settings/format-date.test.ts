import { describe, expect, it } from "vitest";
import { formatApiKeyDate } from "./format-date";

describe("formatApiKeyDate", () => {
  it("formats a date as a short absolute date", () => {
    expect(formatApiKeyDate(new Date("2026-06-01T12:00:00"))).toBe("Jun 1, 2026");
  });

  it("formats a different month/day/year correctly", () => {
    expect(formatApiKeyDate(new Date("2025-12-25T12:00:00"))).toBe("Dec 25, 2025");
  });
});
