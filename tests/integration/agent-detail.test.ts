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
    const { model: _originalModel, ...withoutModel } = original!;
    void _originalModel;
    try {
      await upsertAgent({
        ...withoutModel,
        model: { provider: "google", model: "gemini-2.5-flash-lite" },
      });
      const configured = await listAgentSummaries();
      expect(configured.find((a) => a.id === "customer-support")?.model).toEqual({
        provider: "google",
        model: "gemini-2.5-flash-lite",
      });

      await upsertAgent(withoutModel);
      const unconfigured = await listAgentSummaries();
      expect(unconfigured.find((a) => a.id === "customer-support")?.model).toBeNull();
    } finally {
      await upsertAgent(original!);
    }
  });
});
