import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth, signOut } from "@/server/auth";
import { Avatar, Button } from "@/ui";

/**
 * Authenticated app shell. Server-side auth guard (the reliable enforcement,
 * on Node) — middleware also redirects unauthenticated users earlier for UX.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const user = session.user;
  const displayName = user.name ?? user.email ?? "Account";

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold tracking-tight">
              Roster
            </Link>
            <nav className="flex gap-4 text-sm text-neutral-600">
              <Link href="/dashboard" className="hover:text-neutral-900">
                Dashboard
              </Link>
              <Link href="/playground" className="hover:text-neutral-900">
                Playground
              </Link>
              <Link href="/settings/providers" className="hover:text-neutral-900">
                Providers
              </Link>
              <Link href="/settings" className="hover:text-neutral-900">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Avatar name={displayName} />
            <span className="hidden text-sm text-neutral-600 sm:inline">{user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="secondary" type="submit" data-testid="sign-out">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
