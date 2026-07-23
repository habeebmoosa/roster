import { describe, expect, it } from "vitest";
import { fixtureConversationsForAgents } from "./fixtures";
import type { AgentOption } from "./types";

const ADA: AgentOption = {
  id: "customer-support",
  name: "Ada — Customer Support",
  role: "Support",
};
const MILO: AgentOption = { id: "content-writer", name: "Milo — Content Writer", role: "Writer" };

describe("fixtureConversationsForAgents", () => {
  it("returns an empty list for no agents", () => {
    expect(fixtureConversationsForAgents([])).toEqual([]);
  });

  it("generates at least one conversation per agent, using the real name/id", () => {
    const conversations = fixtureConversationsForAgents([ADA]);
    expect(conversations.length).toBeGreaterThanOrEqual(1);
    for (const c of conversations) {
      expect(c.employeeId).toBe("customer-support");
      expect(c.employeeName).toBe("Ada — Customer Support");
      expect(c.title).toBeTruthy();
      expect(c.date).toBeTruthy();
    }
  });

  it("is deterministic for the same agents", () => {
    expect(fixtureConversationsForAgents([ADA, MILO])).toEqual(
      fixtureConversationsForAgents([ADA, MILO]),
    );
  });

  it("gives each conversation a unique id", () => {
    const conversations = fixtureConversationsForAgents([ADA, MILO]);
    const ids = conversations.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
