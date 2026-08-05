import { describe, expect, it } from "vitest";
import { filterAndPaginateWorkers } from "./list";
import type { WorkerRow } from "./types";

function worker(id: string, name: string, role: string): WorkerRow {
  return {
    id,
    name,
    role,
    status: "active",
    model: "gpt-4o-mini",
    conversations30d: 0,
    lastActivity: "1h ago",
    spendUsd: 0,
  };
}

const ADA = worker("customer-support", "Ada — Customer Support", "Customer Support Specialist");
const MILO = worker("content-writer", "Milo — Content Writer", "Content Writer");
const RIA = worker("research-analyst", "Ria — Research Analyst", "Research Analyst");
const ALL = [ADA, MILO, RIA];

describe("filterAndPaginateWorkers", () => {
  it("returns everything when there is no query and it fits on one page", () => {
    const result = filterAndPaginateWorkers(ALL, {});
    expect(result.rows).toEqual(ALL);
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });

  it("filters by name, case-insensitively", () => {
    const result = filterAndPaginateWorkers(ALL, { q: "ada" });
    expect(result.rows).toEqual([ADA]);
    expect(result.total).toBe(1);
  });

  it("filters by role", () => {
    const result = filterAndPaginateWorkers(ALL, { q: "writer" });
    expect(result.rows).toEqual([MILO]);
  });

  it("returns nothing for a query that matches no one", () => {
    const result = filterAndPaginateWorkers(ALL, { q: "zzz-nobody" });
    expect(result.rows).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
  });

  it("paginates with a small page size", () => {
    const page1 = filterAndPaginateWorkers(ALL, { pageSize: 2, page: 1 });
    expect(page1.rows).toEqual([ADA, MILO]);
    expect(page1.totalPages).toBe(2);

    const page2 = filterAndPaginateWorkers(ALL, { pageSize: 2, page: 2 });
    expect(page2.rows).toEqual([RIA]);
  });

  it("clamps an out-of-range page to the last valid page", () => {
    const result = filterAndPaginateWorkers(ALL, { pageSize: 2, page: 99 });
    expect(result.page).toBe(2);
    expect(result.rows).toEqual([RIA]);
  });

  it("clamps a page below 1 up to 1", () => {
    const result = filterAndPaginateWorkers(ALL, { page: 0 });
    expect(result.page).toBe(1);
  });
});
