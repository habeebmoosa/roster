import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { canAccess } from "./authorized";

/**
 * Edge-safe Auth.js configuration.
 *
 * Deliberately contains NO database adapter — the Prisma client can't run on
 * the Edge runtime, and this config is imported by `middleware.ts` (Edge). The
 * full config that attaches the Prisma adapter lives in `./index.ts` (Node).
 *
 * Session strategy is JWT so middleware can authorize requests by decoding the
 * cookie, with no database round-trip. Users/accounts are still persisted to
 * the DB by the adapter (Node side) on sign-in.
 *
 * Provider credentials are read straight from `process.env` (not the validating
 * env proxy) to keep this module import-safe on the Edge.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    // Each provider is enabled only when its credentials are configured — see
    // `enabledSignInProviders()` below (also drives the sign-in page buttons).
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      return canAccess({ pathname: nextUrl.pathname, isLoggedIn: Boolean(auth?.user) });
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;

export type SignInProviderId = "google" | "github";

/** The sign-in providers that have credentials configured, in display order. */
export function enabledSignInProviders(
  source: Record<string, string | undefined> = process.env,
): SignInProviderId[] {
  const providers: SignInProviderId[] = [];
  if (source.GOOGLE_CLIENT_ID && source.GOOGLE_CLIENT_SECRET) providers.push("google");
  if (source.GITHUB_CLIENT_ID && source.GITHUB_CLIENT_SECRET) providers.push("github");
  return providers;
}
