import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/server/db/repositories/api-key.repository";
import { authenticateApiKey, UnauthorizedError } from "@/server/rest/auth";

let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email: `rest-auth-${Date.now()}@test.local` } });
  userId = user.id;
});

afterAll(async () => {
  await prisma.apiKey.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("authenticateApiKey", () => {
  it("rejects a missing Authorization header", async () => {
    await expect(authenticateApiKey(null)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a header without the Bearer scheme", async () => {
    await expect(authenticateApiKey("rk_live_abc123")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects an unknown key", async () => {
    await expect(authenticateApiKey("Bearer rk_live_not-a-real-key")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("authenticates a valid key and returns its owner", async () => {
    const { rawKey } = await createApiKey(userId, "test key");
    const result = await authenticateApiKey(`Bearer ${rawKey}`);
    expect(result.userId).toBe(userId);
  });

  it("touches lastUsedAt on successful authentication", async () => {
    const { summary, rawKey } = await createApiKey(userId, "touch check");
    expect(summary.lastUsedAt).toBeNull();

    await authenticateApiKey(`Bearer ${rawKey}`);

    const listed = await listApiKeys(userId);
    expect(listed.find((k) => k.id === summary.id)!.lastUsedAt).not.toBeNull();
  });

  it("rejects a revoked key", async () => {
    const { summary, rawKey } = await createApiKey(userId, "revoked key");
    await revokeApiKey(userId, summary.id);
    await expect(authenticateApiKey(`Bearer ${rawKey}`)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
