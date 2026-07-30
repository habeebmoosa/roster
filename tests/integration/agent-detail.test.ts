import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { getAgentDefinition } from "@/server/db/repositories/agent.repository";

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
