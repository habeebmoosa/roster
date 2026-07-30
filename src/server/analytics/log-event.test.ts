import { describe, expect, it, vi } from "vitest";
import { logEvent } from "./log-event";

const createAnalyticsEvent = vi.fn();
vi.mock("@/server/db/repositories/analytics-event.repository", () => ({
  createAnalyticsEvent: (...args: unknown[]) => createAnalyticsEvent(...args),
}));

describe("logEvent", () => {
  it("persists the event via the repository", async () => {
    createAnalyticsEvent.mockResolvedValueOnce(undefined);

    await logEvent({ userId: "user-1", event: "signed_up", metadata: { via: "google" } });

    expect(createAnalyticsEvent).toHaveBeenCalledWith({
      userId: "user-1",
      event: "signed_up",
      metadata: { via: "google" },
    });
  });

  it("never throws when the repository write fails — logging must not break the real action", async () => {
    createAnalyticsEvent.mockRejectedValueOnce(new Error("db down"));

    await expect(logEvent({ event: "signed_up" })).resolves.toBeUndefined();
  });
});
