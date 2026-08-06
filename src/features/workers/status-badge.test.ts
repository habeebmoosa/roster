import { describe, expect, it } from "vitest";
import { agentStatusBadge } from "./status-badge";

describe("agentStatusBadge", () => {
  it("maps active to a success badge", () => {
    expect(agentStatusBadge("active")).toEqual({ label: "Active", variant: "success" });
  });

  it("maps paused to a neutral badge", () => {
    expect(agentStatusBadge("paused")).toEqual({ label: "Paused", variant: "neutral" });
  });
});
