"use client";

import { signOutAction } from "@/server/auth/actions";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  dropdownMenuItemClasses,
} from "@/ui";
import { ThemeToggle } from "@/ui/theme";
import { IconBook, IconLogOut, IconSparkle } from "@/ui/icons";

export function ProfileMenu({ workspaceName, email }: { workspaceName: string; email: string }) {
  return (
    <DropdownMenu className="w-full">
      <DropdownMenuTrigger className="hover:bg-bg-subtle border-border flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-colors">
        <Avatar name={workspaceName} />
        <span className="min-w-0 flex-1">
          <span className="text-text block truncate text-sm font-semibold">{workspaceName}</span>
          <span className="text-text-faint block truncate text-xs">{email}</span>
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuItem>
          <IconBook className="text-text-faint h-4 w-4" />
          Documentation
        </DropdownMenuItem>
        <DropdownMenuItem>
          <IconSparkle className="text-accent h-4 w-4" />
          Upgrade plan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2.5 py-2">
          <span className="text-text flex items-center gap-2 text-sm">Dark mode</span>
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <button type="submit" className={dropdownMenuItemClasses} data-testid="sign-out">
            <IconLogOut className="text-text-faint h-4 w-4" />
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
