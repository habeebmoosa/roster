"use client";

import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconChevronDown,
} from "@/ui";

/** A single-select "Filter by" dropdown — choosing a category shows only connectors tagged with it; "All categories" clears it. */
export function ConnectorCategoryFilter({
  categories,
  selected,
  onSelect,
}: {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-border bg-bg text-text hover:bg-bg-subtle flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors">
        <span>Filter by{selected ? `: ${selected}` : ""}</span>
        <IconChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuItem
          onSelect={() => onSelect(null)}
          className={cn(selected === null && "bg-bg-subtle")}
        >
          All categories
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {categories.map((category) => (
          <DropdownMenuItem
            key={category}
            onSelect={() => onSelect(category)}
            className={cn(selected === category && "bg-bg-subtle")}
          >
            {category}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
