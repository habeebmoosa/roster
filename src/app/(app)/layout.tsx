import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";
import { auth } from "@/server/auth";

/**
 * Authenticated app shell. Server-side auth guard (the reliable enforcement,
 * on Node) — middleware also redirects unauthenticated users earlier for UX.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const user = session.user;

  // No multi-tenant workspace model yet — the sidebar's "workspace" identity
  // is just the signed-in user's own name/email until that lands.
  return (
    <AppShell workspaceName={user.name ?? user.email ?? "Account"} email={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
