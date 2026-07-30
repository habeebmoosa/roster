import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import {
  createAnalyticsEvent,
  listAnalyticsEventsForUser,
} from "@/server/db/repositories/analytics-event.repository";

let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `analytics-event-${Date.now()}@test.local` },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.analyticsEvent.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("analytics-event repository", () => {
  it("starts with no events for a fresh user", async () => {
    expect(await listAnalyticsEventsForUser(userId)).toEqual([]);
  });

  it("creates an event with metadata", async () => {
    await createAnalyticsEvent({
      userId,
      event: "provider_key_added",
      metadata: { provider: "openai" },
    });

    const listed = await listAnalyticsEventsForUser(userId);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      event: "provider_key_added",
      metadata: { provider: "openai" },
    });
  });

  it("creates an event with no metadata and no userId (anonymous)", async () => {
    await createAnalyticsEvent({ event: "signed_up" });

    const rows = await prisma.analyticsEvent.findMany({ where: { userId: null } });
    expect(rows.some((r) => r.event === "signed_up")).toBe(true);
    await prisma.analyticsEvent.deleteMany({ where: { userId: null, event: "signed_up" } });
  });

  it("lists newest first", async () => {
    await createAnalyticsEvent({ userId, event: "employee_hired" });

    const listed = await listAnalyticsEventsForUser(userId);
    expect(listed[0]!.event).toBe("employee_hired");
    expect(listed[listed.length - 1]!.event).toBe("provider_key_added");
  });
});
