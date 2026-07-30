import type { User } from "next-auth";
import { ANALYTICS_EVENTS } from "@/server/analytics/events";
import { logEvent } from "@/server/analytics/log-event";

/**
 * NextAuth's `events.createUser` callback: fires exactly once, when the
 * Prisma adapter creates the row — not on every sign-in — so this is a true
 * "signed up" funnel event. Kept in its own module (not inlined in
 * `index.ts`) so it's importable without triggering `NextAuth(...)`'s own
 * construction, which doesn't resolve under Vitest's bundler (see
 * profile-menu.test.tsx for the same issue with a different auth import).
 */
export async function onUserCreated({ user }: { user: User }): Promise<void> {
  if (user.id) await logEvent({ userId: user.id, event: ANALYTICS_EVENTS.SIGNED_UP });
}
