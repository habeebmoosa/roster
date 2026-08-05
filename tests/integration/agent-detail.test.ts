import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import {
  getAgentDefinition,
  getAgentStatus,
  listAgentSummaries,
  updateAgentStatus,
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

describe("getAgentStatus / updateAgentStatus", () => {
  it("defaults to active for a seeded agent, and is not affected by upsertAgent", async () => {
    const original = await getAgentDefinition("content-writer");
    try {
      expect(await getAgentStatus("content-writer")).toBe("active");
      await upsertAgent(original!); // re-upserting must never silently reset status
      expect(await getAgentStatus("content-writer")).toBe("active");
    } finally {
      await upsertAgent(original!);
      await updateAgentStatus("content-writer", "active");
    }
  });

  it("pauses and resumes an agent, and re-upserting its definition doesn't undo the pause", async () => {
    const original = await getAgentDefinition("content-writer");
    try {
      await updateAgentStatus("content-writer", "paused");
      expect(await getAgentStatus("content-writer")).toBe("paused");

      // A reseed/definition update must never silently resume a paused agent —
      // status is runtime state, orthogonal to the portable definition spec.
      await upsertAgent(original!);
      expect(await getAgentStatus("content-writer")).toBe("paused");

      await updateAgentStatus("content-writer", "active");
      expect(await getAgentStatus("content-writer")).toBe("active");
    } finally {
      await upsertAgent(original!);
      await updateAgentStatus("content-writer", "active");
    }
  });

  it("returns null for an agent that doesn't exist", async () => {
    expect(await getAgentStatus("__does_not_exist__")).toBeNull();
  });

  it("surfaces each agent's real status via listAgentSummaries", async () => {
    try {
      await updateAgentStatus("content-writer", "paused");
      const summaries = await listAgentSummaries();
      expect(summaries.find((a) => a.id === "content-writer")?.status).toBe("paused");
      expect(summaries.find((a) => a.id === "customer-support")?.status).toBe("active");
    } finally {
      await updateAgentStatus("content-writer", "active");
    }
  });
});
