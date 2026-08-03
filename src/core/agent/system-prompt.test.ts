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

  it("omits retrieved-context and episodic-memory sections when none is given", () => {
    const prompt = buildSystemPrompt(def);
    expect(prompt).not.toContain("Reference material");
    expect(prompt).not.toContain("What you remember about this user");
  });

  it("folds in retrieved context when given", () => {
    const prompt = buildSystemPrompt(def, {
      retrievedContext: "Refunds are available within 30 days.",
    });
    expect(prompt).toContain("Reference material");
    expect(prompt).toContain("Refunds are available within 30 days.");
  });

  it("folds in episodic memory when given", () => {
    const prompt = buildSystemPrompt(def, {
      episodicMemory: [{ key: "preference:tone", value: "prefers short replies" }],
    });
    expect(prompt).toContain("What you remember about this user");
    expect(prompt).toContain("preference:tone: prefers short replies");
  });

  it("omits an empty episodic memory array (same as undefined)", () => {
    expect(buildSystemPrompt(def, { episodicMemory: [] })).not.toContain(
      "What you remember about this user",
    );
  });

  it("instructs the model to answer capability questions from role/expertise, not by reciting its tools", () => {
    // Regression: a cheap model, asked "what can you do?", answered by
    // paraphrasing its tool schema ("perform calculations", "convert PDFs to
    // text") instead of its actual expertise — the system prompt never said
    // which one to prefer. This line is what fixes that, for every agent.
    expect(buildSystemPrompt(def)).toContain("not by listing the internal tools available to you");
  });
});
