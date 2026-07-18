import { describe, expect, it } from "vitest";
import { parseAgentDefinition } from "./definition";

const MINIMAL = {
  id: "customer-support",
  name: "Ada",
  role: "Support",
  identity: "Calm and precise.",
  voice: "Warm but concise.",
};

describe("parseAgentDefinition", () => {
  it("parses a minimal definition and applies defaults", () => {
    const def = parseAgentDefinition(MINIMAL);
    expect(def.id).toBe("customer-support");
    expect(def.expertise).toEqual([]);
    expect(def.abilities).toEqual([]);
    expect(def.memory).toEqual({ semantic: [], procedural: [] });
    expect(def.context_budget_tokens).toBe(8000);
  });

  it("keeps provided optional fields", () => {
    const def = parseAgentDefinition({
      ...MINIMAL,
      expertise: ["de-escalation"],
      abilities: ["kb_lookup"],
      context_budget_tokens: 4000,
    });
    expect(def.expertise).toEqual(["de-escalation"]);
    expect(def.context_budget_tokens).toBe(4000);
  });

  it("rejects a missing required field", () => {
    const { name: _omitted, ...rest } = MINIMAL;
    void _omitted;
    expect(() => parseAgentDefinition(rest)).toThrow(/name/);
  });

  it("rejects a non-kebab-case id", () => {
    expect(() => parseAgentDefinition({ ...MINIMAL, id: "Customer Support" })).toThrow(/id/);
  });

  it("rejects a non-positive context budget", () => {
    expect(() => parseAgentDefinition({ ...MINIMAL, context_budget_tokens: 0 })).toThrow();
  });
});
