import { afterAll, describe, expect, it } from "vitest";
import { parseAgentDefinition } from "@/core/agent";
import { prisma } from "@/server/db/prisma";
import { getAgentDefinition, upsertAgent } from "@/server/db/repositories/agent.repository";

/**
 * The hire wizard's "create" step, at the repository layer: POST /api/agents
 * (src/app/api/agents/route.ts) is a thin wrapper around exactly this
 * check-then-write sequence, so it's exercised here rather than through the
 * route handler (consistent with agent-run.test.ts / agent-detail.test.ts).
 */
const TEST_ID = `hire-test-${Date.now()}`;

afterAll(async () => {
  await prisma.agent.delete({ where: { id: TEST_ID } }).catch(() => {});
  await prisma.$disconnect();
});

describe("hire wizard agent creation", () => {
  it("creates a new agent from a wizard-shaped payload, including model", async () => {
    const definition = parseAgentDefinition({
      id: TEST_ID,
      name: "Test Employee",
      role: "QA Specialist",
      identity: "Thorough and detail-oriented.",
      voice: "Direct and clear.",
      expertise: ["Manual testing"],
      abilities: ["kb_lookup"],
      model: { provider: "openai", model: "gpt-4o-mini" },
    });

    expect(await getAgentDefinition(TEST_ID)).toBeNull();

    await upsertAgent(definition);

    const stored = await getAgentDefinition(TEST_ID);
    expect(stored).not.toBeNull();
    expect(stored!.name).toBe("Test Employee");
    expect(stored!.model).toEqual({ provider: "openai", model: "gpt-4o-mini" });
  });

  it("lets the route's duplicate check see an id that already exists", async () => {
    const existing = await getAgentDefinition(TEST_ID);
    expect(existing).not.toBeNull(); // created above — a real POST /api/agents would 409 here
  });
});
