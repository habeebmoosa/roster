import type { WorkerRow } from "./types";

export interface WorkerListQuery {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface WorkerListResult {
  rows: WorkerRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 10;

/** Pure: filter by name/role (case-insensitive) and paginate. Page numbers clamp to a valid range. */
export function filterAndPaginateWorkers(
  all: WorkerRow[],
  query: WorkerListQuery,
): WorkerListResult {
  const q = query.q?.trim().toLowerCase();
  const filtered = q
    ? all.filter((w) => w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q))
    : all;

  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, query.page ?? 1), totalPages);
  const start = (page - 1) * pageSize;

  return {
    rows: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    totalPages,
  };
}
