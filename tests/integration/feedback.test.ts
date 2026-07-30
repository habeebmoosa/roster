import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { createFeedback } from "@/server/db/repositories/feedback.repository";

let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email: `feedback-${Date.now()}@test.local` } });
  userId = user.id;
});

afterAll(async () => {
  await prisma.feedback.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("feedback repository", () => {
  it("creates feedback for a user", async () => {
    const feedback = await createFeedback({ userId, message: "Love the product!" });
    expect(feedback.message).toBe("Love the product!");
    expect(feedback.userId).toBe(userId);
    expect(feedback.createdAt).toBeInstanceOf(Date);
  });

  it("creates anonymous feedback (no userId)", async () => {
    const feedback = await createFeedback({ message: "Anonymous note" });
    expect(feedback.userId).toBeNull();
    await prisma.feedback.delete({ where: { id: feedback.id } });
  });
});
