import { describe, expect, it } from "vitest";
import { formatLastActivity } from "./format-date";

const NOW = new Date("2026-07-27T15:00:00");

describe("formatLastActivity", () => {
  it("returns 'Today' for the same calendar day, regardless of time of day", () => {
    expect(formatLastActivity(new Date("2026-07-27T00:05:00"), NOW)).toBe("Today");
    expect(formatLastActivity(new Date("2026-07-27T23:55:00"), NOW)).toBe("Today");
  });

  it("returns 'Yesterday' for the prior calendar day", () => {
    expect(formatLastActivity(new Date("2026-07-26T23:55:00"), NOW)).toBe("Yesterday");
  });

  it("returns 'N days ago' within the past week", () => {
    expect(formatLastActivity(new Date("2026-07-24T12:00:00"), NOW)).toBe("3 days ago");
    expect(formatLastActivity(new Date("2026-07-21T12:00:00"), NOW)).toBe("6 days ago");
  });

  it("falls back to a short date beyond a week", () => {
    expect(formatLastActivity(new Date("2026-07-10T12:00:00"), NOW)).toBe("Jul 10");
  });

  it("treats a future date as 'Today' rather than a negative day count", () => {
    expect(formatLastActivity(new Date("2026-07-28T00:00:00"), NOW)).toBe("Today");
  });
});
