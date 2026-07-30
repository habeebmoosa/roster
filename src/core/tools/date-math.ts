import { tool } from "ai";
import { z } from "zod";
import { DateTime } from "luxon";

const DURATION_UNIT = z.enum(["years", "months", "weeks", "days", "hours", "minutes", "seconds"]);

function parseDate(iso: string, zone?: string): DateTime {
  const dt = zone ? DateTime.fromISO(iso, { zone }) : DateTime.fromISO(iso, { setZone: true });
  if (!dt.isValid) {
    throw new Error(`Invalid date "${iso}": ${dt.invalidReason} — ${dt.invalidExplanation}`);
  }
  return dt;
}

export const dateTimeMath = tool({
  description:
    "Do date and timezone arithmetic: add or subtract a duration from a date, find the difference between two dates, or convert a date to another timezone. Dates are ISO-8601 strings (e.g. '2026-07-26T09:00:00'); timezones are IANA names (e.g. 'America/New_York').",
  inputSchema: z.object({
    operation: z.enum(["add", "subtract", "diff", "convertTimezone"]),
    date: z.string().describe("The base ISO-8601 date/time to operate on."),
    otherDate: z
      .string()
      .optional()
      .describe("Required for 'diff': the ISO-8601 date/time to compare against `date`."),
    amount: z
      .number()
      .optional()
      .describe("Required for 'add'/'subtract': how many units to shift by."),
    unit: DURATION_UNIT.optional().describe(
      "Required for 'add'/'subtract'/'diff': the duration unit.",
    ),
    timezone: z
      .string()
      .optional()
      .describe(
        "IANA timezone name. For 'convertTimezone' this is the target zone; otherwise it's the zone `date` is interpreted in (default UTC).",
      ),
  }),
  execute: async ({ operation, date, otherDate, amount, unit, timezone }) => {
    switch (operation) {
      case "add": {
        if (amount === undefined || !unit) throw new Error("'add' requires 'amount' and 'unit'");
        const result = parseDate(date, timezone).plus({ [unit]: amount });
        return { result: result.toISO() };
      }
      case "subtract": {
        if (amount === undefined || !unit) {
          throw new Error("'subtract' requires 'amount' and 'unit'");
        }
        const result = parseDate(date, timezone).minus({ [unit]: amount });
        return { result: result.toISO() };
      }
      case "diff": {
        if (!otherDate || !unit) throw new Error("'diff' requires 'otherDate' and 'unit'");
        const start = parseDate(date, timezone);
        const end = parseDate(otherDate, timezone);
        const diff = end.diff(start, unit).get(unit);
        return { result: diff };
      }
      case "convertTimezone": {
        if (!timezone) throw new Error("'convertTimezone' requires 'timezone'");
        const result = parseDate(date).setZone(timezone);
        return { result: result.toISO() };
      }
    }
  },
});
