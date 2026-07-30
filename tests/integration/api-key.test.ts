import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import {
  createApiKey,
  findActiveApiKeyByRawKey,
  listApiKeys,
  revokeApiKey,
  touchApiKeyLastUsed,
} from "@/server/db/repositories/api-key.repository";

let userId: string;
let otherUserId: string;

beforeAll(async () => {
  const [user, otherUser] = await Promise.all([
    prisma.user.create({ data: { email: `api-key-${Date.now()}@test.local` } }),
    prisma.user.create({ data: { email: `api-key-other-${Date.now()}@test.local` } }),
  ]);
  userId = user.id;
  otherUserId = otherUser.id;
});

afterAll(async () => {
  await prisma.apiKey.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  await prisma.$disconnect();
});

describe("api-key repository", () => {
  it("starts with no keys for a fresh user", async () => {
    expect(await listApiKeys(userId)).toEqual([]);
  });

  it("creates a key, returning the raw key once and a safe summary", async () => {
    const { summary, rawKey } = await createApiKey(userId, "CI pipeline");
    expect(rawKey.startsWith("rk_live_")).toBe(true);
    expect(summary.label).toBe("CI pipeline");
    expect(summary.keyPrefix.length).toBeLessThan(rawKey.length);
    expect(summary.revokedAt).toBeNull();
    expect(summary.lastUsedAt).toBeNull();
    expect((summary as unknown as { hashedKey?: string }).hashedKey).toBeUndefined();

    const listed = await listApiKeys(userId);
    expect(listed.map((k) => k.id)).toContain(summary.id);
  });

  it("finds an active key by its raw value and rejects a wrong one", async () => {
    const { rawKey } = await createApiKey(userId, "lookup test");

    const found = await findActiveApiKeyByRawKey(rawKey);
    expect(found).toEqual({ id: expect.any(String), userId });

    expect(await findActiveApiKeyByRawKey("rk_live_not-a-real-key")).toBeNull();
  });

  it("updates lastUsedAt", async () => {
    const { summary } = await createApiKey(userId, "touch test");
    expect(summary.lastUsedAt).toBeNull();

    await touchApiKeyLastUsed(summary.id);

    const listed = await listApiKeys(userId);
    const updated = listed.find((k) => k.id === summary.id);
    expect(updated!.lastUsedAt).not.toBeNull();
  });

  it("revokes a key, which then fails lookup by raw key", async () => {
    const { summary, rawKey } = await createApiKey(userId, "revoke test");
    await revokeApiKey(userId, summary.id);

    const listed = await listApiKeys(userId);
    expect(listed.find((k) => k.id === summary.id)!.revokedAt).not.toBeNull();
    expect(await findActiveApiKeyByRawKey(rawKey)).toBeNull();
  });

  it("does not revoke another user's key", async () => {
    const { summary, rawKey } = await createApiKey(otherUserId, "someone else's key");
    await revokeApiKey(userId, summary.id);

    expect(await findActiveApiKeyByRawKey(rawKey)).not.toBeNull();
  });

  it("does not list another user's keys", async () => {
    const listed = await listApiKeys(userId);
    expect(listed.every((k) => k.label !== "someone else's key")).toBe(true);
  });
});
