"use client";

import Link from "next/link";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui";
import type { AgentOption } from "../types";

export function EmployeeSwitcher({
  agents,
  currentId,
  onSelect,
}: {
  agents: AgentOption[];
  currentId: string;
  onSelect: (id: string) => void;
}) {
  const current = agents.find((a) => a.id === currentId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-bg-subtle flex items-center gap-2.5 rounded-lg p-1.5 pr-3 text-left transition-colors">
        <Avatar name={current?.name} />
        <span className="min-w-0">
          <span className="text-text block truncate text-sm font-semibold">
            {current?.name ?? "Select an employee"}
          </span>
          <span className="text-text-muted block truncate text-xs">{current?.role}</span>
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64">
        <p className="text-text-faint px-2.5 py-1.5 text-xs font-medium tracking-wide uppercase">
          Switch employee
        </p>
        {agents.map((agent) => (
          <DropdownMenuItem key={agent.id} onSelect={() => onSelect(agent.id)}>
            <Avatar name={agent.name} size="sm" />
            <span className="min-w-0">
              <span className="text-text block truncate">{agent.name}</span>
              <span className="text-text-faint block truncate text-xs">{agent.role}</span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <Link
          href="/workers"
          className="text-text hover:bg-bg-subtle flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors"
        >
          Manage roster
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
