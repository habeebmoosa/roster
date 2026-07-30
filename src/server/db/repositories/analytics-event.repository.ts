import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/server/db/prisma";

export interface CreateAnalyticsEventInput {
  userId?: string;
  event: string;
  metadata?: Record<string, unknown>;
}

export async function createAnalyticsEvent(input: CreateAnalyticsEventInput): Promise<void> {
  await prisma.analyticsEvent.create({
    data: {
      userId: input.userId,
      event: input.event,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export interface AnalyticsEventRecord {
  id: string;
  userId: string | null;
  event: string;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}

/** All events recorded for a user, newest first — used by tests and any future funnel reporting. */
export function listAnalyticsEventsForUser(userId: string): Promise<AnalyticsEventRecord[]> {
  return prisma.analyticsEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
