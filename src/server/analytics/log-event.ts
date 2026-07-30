import { createAnalyticsEvent } from "@/server/db/repositories/analytics-event.repository";
import type { AnalyticsEventName } from "./events";

export interface LogEventInput {
  userId?: string;
  event: AnalyticsEventName;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget: a logging failure must never break the real action it's
 * attached to (signing up, adding a key, hiring an employee, sending a
 * message). Errors are swallowed and only reach the console — same
 * degrade-gracefully treatment as retrieval's `tryRetrieveGroundingContext`.
 */
export async function logEvent(input: LogEventInput): Promise<void> {
  try {
    await createAnalyticsEvent(input);
  } catch (err) {
    console.error(`Failed to log analytics event "${input.event}":`, err);
  }
}
