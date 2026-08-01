import Link from "next/link";
import {
  Avatar,
  Badge,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui";
import type { WorkerRow } from "../types";

export function WorkersTable({ rows }: { rows: WorkerRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No workers found"
        description="Try a different search, or hire your first AI employee."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Employee</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Convos</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Spend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Link href={`/workers/${row.id}`} className="flex items-center gap-3">
                <Avatar name={row.name} />
                <span className="min-w-0">
                  <span className="text-text block truncate text-sm font-semibold hover:underline">
                    {row.name}
                  </span>
                  <span className="text-text-muted block truncate text-xs">{row.role}</span>
                </span>
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant="success">{row.status}</Badge>
            </TableCell>
            <TableCell className={row.model ? "text-text-muted" : "text-text-faint italic"}>
              {row.model ?? "Not configured"}
            </TableCell>
            <TableCell className="text-text-muted">{row.conversations30d ?? "—"}</TableCell>
            <TableCell className="text-text-faint">{row.lastActivity ?? "—"}</TableCell>
            <TableCell className="text-text text-right font-medium">
              {row.spendUsd != null ? `$${row.spendUsd.toFixed(0)}` : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
