"use client";

import { useState, type ReactNode } from "react";
import { FeedbackButton } from "@/features/feedback";
import { Drawer } from "@/ui";
import { IconMenu } from "./icons";
import { Sidebar } from "./sidebar";

export function AppShell({
  workspaceName,
  email,
  children,
}: {
  workspaceName: string;
  email: string;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="bg-bg-subtle flex h-screen gap-2.5 overflow-hidden p-2.5">
      {/* Desktop sidebar — persistent column. */}
      <Sidebar workspaceName={workspaceName} email={email} className="hidden lg:flex" />

      {/* Mobile sidebar — slide-over reusing the same Sidebar content. */}
      <Drawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} side="left">
        <Sidebar
          workspaceName={workspaceName}
          email={email}
          className="h-full w-full border-none p-0"
        />
      </Drawer>

      <div className="bg-bg-elevated border-border flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="text-text-faint hover:text-text m-3 flex h-9 w-9 items-center justify-center rounded-lg lg:hidden"
        >
          <IconMenu className="h-5 w-5" />
        </button>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <FeedbackButton />
    </div>
  );
}
