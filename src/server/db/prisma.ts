import { PrismaClient } from "@/generated/prisma";
import { env } from "@/lib/env";

/**
 * Singleton PrismaClient. In development, Next.js hot-reload would otherwise
 * create a new client on every change and exhaust connections, so we cache it
 * on globalThis. Accessing `env` here also validates configuration on first use.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
