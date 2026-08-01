import { describe, expect, it } from "vitest";
import { parseAgentDefinition, preserveRuntimeModel } from "./definition";

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

  it("leaves model undefined when omitted", () => {
    const def = parseAgentDefinition(MINIMAL);
    expect(def.model).toBeUndefined();
  });

  it("keeps a provided model", () => {
    const def = parseAgentDefinition({
      ...MINIMAL,
      model: { provider: "openai", model: "gpt-4o-mini" },
    });
    expect(def.model).toEqual({ provider: "openai", model: "gpt-4o-mini" });
  });

  it("rejects an incomplete model object", () => {
    expect(() => parseAgentDefinition({ ...MINIMAL, model: { provider: "openai" } })).toThrow(
      /model/,
    );
  });
});

describe("preserveRuntimeModel", () => {
  // Regression: prisma/seed.ts and scripts/ingest-knowledge.ts re-upsert an
  // agent's *entire* definition from its YAML file. The YAML spec never sets
  // `model` (it's runtime-only — the worker detail page's Model tab, or the
  // hire wizard) — so without this, every reseed silently wiped a
  // real, already-configured default back to "unconfigured."
  const fresh = parseAgentDefinition({
    id: "customer-support",
    name: "Ada",
    role: "Support",
    identity: "Calm and precise.",
    voice: "Warm but concise.",
  });

  it("carries over the existing model when the fresh (YAML) definition has none", () => {
    const existing = { ...fresh, model: { provider: "google", model: "gemini-2.5-flash-lite" } };
    const merged = preserveRuntimeModel(fresh, existing);
    expect(merged.model).toEqual({ provider: "google", model: "gemini-2.5-flash-lite" });
  });

  it("leaves the fresh definition's own model untouched if it explicitly sets one", () => {
    const freshWithModel = { ...fresh, model: { provider: "openai", model: "gpt-4o-mini" } };
    const existing = { ...fresh, model: { provider: "google", model: "gemini-2.5-flash-lite" } };
    const merged = preserveRuntimeModel(freshWithModel, existing);
    expect(merged.model).toEqual({ provider: "openai", model: "gpt-4o-mini" });
  });

  it("stays undefined when neither the fresh nor the existing definition has one", () => {
    expect(preserveRuntimeModel(fresh, fresh).model).toBeUndefined();
    expect(preserveRuntimeModel(fresh, null).model).toBeUndefined();
  });

  it("is a no-op the very first time an agent is seeded (no existing row yet)", () => {
    expect(preserveRuntimeModel(fresh, null)).toEqual(fresh);
  });
});
