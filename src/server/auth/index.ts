import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db/prisma";
import { authConfig } from "./config";

/**
 * Full (Node) Auth.js instance: the edge-safe config plus the Prisma adapter,
 * which persists users and linked OAuth accounts. Import `auth`, `signIn`,
 * `signOut`, and `handlers` from here in server components / route handlers.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
});
