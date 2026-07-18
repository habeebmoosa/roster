import { describe, expect, it } from "vitest";
import { parseAgentDefinition } from "./definition";
import { buildSystemPrompt } from "./system-prompt";

const def = parseAgentDefinition({
  id: "customer-support",
  name: "Ada — Customer Support",
  role: "Customer Support Specialist",
  identity: "Calm and precise.",
  voice: "Warm but concise.",
  expertise: ["de-escalation", "policy interpretation"],
});

describe("buildSystemPrompt", () => {
  it("includes identity, voice, role, name, and each expertise area", () => {
    const prompt = buildSystemPrompt(def);
    expect(prompt).toContain("Ada — Customer Support");
    expect(prompt).toContain("Customer Support Specialist");
    expect(prompt).toContain("Calm and precise.");
    expect(prompt).toContain("Warm but concise.");
    expect(prompt).toContain("de-escalation");
    expect(prompt).toContain("policy interpretation");
  });

  it("is deterministic (same input → same output)", () => {
    expect(buildSystemPrompt(def)).toBe(buildSystemPrompt(def));
  });

  it("omits the expertise section when there is none", () => {
    const bare = parseAgentDefinition({
      id: "x",
      name: "X",
      role: "R",
      identity: "i",
      voice: "v",
    });
    expect(buildSystemPrompt(bare)).not.toContain("Areas of expertise");
  });
});
