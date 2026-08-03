import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import {
  getAgentDefinition,
  listAgentSummaries,
  upsertAgent,
} from "@/server/db/repositories/agent.repository";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("getAgentDefinition", () => {
  it("returns the real, re-validated definition for a seeded agent", async () => {
    const definition = await getAgentDefinition("customer-support");
    expect(definition).not.toBeNull();
    expect(definition!.name).toContain("Ada");
    expect(definition!.role).toBeTruthy();
  });

  it("returns null for an agent id that doesn't exist (drives notFound() on /workers/[id])", async () => {
    const definition = await getAgentDefinition("__does_not_exist__");
    expect(definition).toBeNull();
  });
});

describe("listAgentSummaries", () => {
  // Regression: the Workers list/dashboard preview used to always show fake
  // fixture model data regardless of what was actually configured — this
  // proves the real value (or null, honestly, when unset) comes through.
  it("surfaces each agent's real configured model, or null when unset", async () => {
    const original = await getAgentDefinition("customer-support");
    try {
      await upsertAgent({
        ...original!,
        model: { provider: "google", model: "gemini-2.5-flash-lite" },
      });
      const configured = await listAgentSummaries();
      expect(configured.find((a) => a.id === "customer-support")?.model).toEqual({
        provider: "google",
        model: "gemini-2.5-flash-lite",
      });

      // A launch employee with no default model ever set (no test mutates
      // this one) — proves the null case without needing to clear an
      // existing model, which upsertAgent now deliberately refuses to do
      // (see the test below).
      const unconfigured = await listAgentSummaries();
      expect(unconfigured.find((a) => a.id === "content-writer")?.model).toBeNull();
    } finally {
      await upsertAgent(original!);
    }
  });
});

describe("upsertAgent — model preservation (regression: this silently clobbered a real, already-configured model at least twice)", () => {
  it("refuses to clear an existing model when the incoming definition doesn't set one", async () => {
    const original = await getAgentDefinition("customer-support");
    const { model: _originalModel, ...withoutModel } = original!;
    void _originalModel;
    try {
      await upsertAgent({
        ...withoutModel,
        model: { provider: "google", model: "gemini-2.5-flash-lite" },
      });

      // Simulates exactly the bug: a reseed (or any future caller) passing a
      // definition that simply doesn't mention `model` — e.g. straight from
      // the YAML file, which never sets one. upsertAgent() must not treat
      // "omitted" as "clear it" for a field it doesn't own.
      await upsertAgent(withoutModel);

      const after = await getAgentDefinition("customer-support");
      expect(after?.model).toEqual({ provider: "google", model: "gemini-2.5-flash-lite" });
    } finally {
      await upsertAgent(original!);
    }
  });

  it("still lets an explicit new model win over the existing one", async () => {
    const original = await getAgentDefinition("customer-support");
    try {
      await upsertAgent({
        ...original!,
        model: { provider: "google", model: "gemini-2.5-flash-lite" },
      });
      await upsertAgent({
        ...original!,
        model: { provider: "anthropic", model: "claude-sonnet-5" },
      });

      const after = await getAgentDefinition("customer-support");
      expect(after?.model).toEqual({ provider: "anthropic", model: "claude-sonnet-5" });
    } finally {
      await upsertAgent(original!);
    }
  });
});
