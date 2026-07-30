import { prisma } from "@/server/db/prisma";

export interface CreateFeedbackInput {
  userId?: string;
  message: string;
}

export interface FeedbackRecord {
  id: string;
  userId: string | null;
  message: string;
  createdAt: Date;
}

export function createFeedback(input: CreateFeedbackInput): Promise<FeedbackRecord> {
  return prisma.feedback.create({
    data: { userId: input.userId, message: input.message },
  });
}
