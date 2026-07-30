import { beforeEach, describe, expect, it, vi } from "vitest";

const logEvent = vi.fn();
vi.mock("@/server/analytics/log-event", () => ({
  logEvent: (...args: unknown[]) => logEvent(...args),
}));

import { onUserCreated } from "./on-user-created";

describe("onUserCreated", () => {
  beforeEach(() => {
    logEvent.mockClear();
  });

  it("logs a signed_up event for the new user", async () => {
    await onUserCreated({ user: { id: "user-1" } });
    expect(logEvent).toHaveBeenCalledWith({ userId: "user-1", event: "signed_up" });
  });

  it("does nothing if the user somehow has no id", async () => {
    await onUserCreated({ user: { id: "" } });
    expect(logEvent).not.toHaveBeenCalled();
  });
});
