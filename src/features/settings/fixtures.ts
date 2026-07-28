import type { InvoiceFixture } from "./types";

export const TIMEZONES = [
  "(GMT-08:00) Pacific Time",
  "(GMT-05:00) Eastern Time",
  "(GMT+00:00) UTC",
  "(GMT+01:00) Central European Time",
  "(GMT+05:30) India Standard Time",
];

export const FIXTURE_INVOICES: InvoiceFixture[] = [
  { id: "INV-0002", date: "Jul 1, 2026", amount: "$0.00", status: "Paid" },
  { id: "INV-0001", date: "Jun 1, 2026", amount: "$0.00", status: "Paid" },
];
