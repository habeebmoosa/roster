"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Button } from "@/ui";
import { cn } from "@/lib/cn";
import { NAV_GROUPS } from "./nav-items";
import { ProfileMenu } from "./profile-menu";
import { IconPlus } from "@/ui/icons";

export function Sidebar({
  workspaceName,
  email,
  className,
}: {
  workspaceName: string;
  email: string;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "bg-bg-elevated border-border flex h-full w-64 shrink-0 flex-col rounded-xl border p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between px-1 pb-4">
        <span className="text-text text-base font-extrabold tracking-tight">RosterAI</span>
      </div>

      <Link href="/hire" className="mb-4">
        <Button className="w-full justify-center gap-1.5">
          <IconPlus className="h-3.5 w-3.5" />
          Hire employee
        </Button>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-text-faint px-2 pt-4 pb-1.5 text-[10.5px] font-bold tracking-wider uppercase">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);

                if (!item.enabled) {
                  return (
                    <div
                      key={item.href}
                      className="text-text-faint flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold"
                    >
                      <item.Icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      <Badge variant="neutral">Soon</Badge>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors",
                      active ? "bg-accent-soft text-accent" : "text-text hover:bg-bg-subtle",
                    )}
                  >
                    <item.Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-border mt-auto border-t pt-3">
        <ProfileMenu workspaceName={workspaceName} email={email} />
      </div>
    </aside>
  );
}
