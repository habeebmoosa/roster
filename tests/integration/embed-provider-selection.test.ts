import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { encryptSecret } from "@/server/crypto/vault";
import { createProviderKey } from "@/server/db/repositories/provider-key.repository";
import { prisma } from "@/server/db/prisma";
import { getEmbeddingResolveInputForUser } from "@/server/providers/service";

/**
 * getEmbeddingResolveInputForUser() picks the user's best embedding-capable
 * saved provider (BYOK) — required so ingestion and query-time embedding
 * always agree on which provider/model produced a given agent's vectors.
 */
let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `embed-select-${Date.now()}@test.local` },
  });
  userId = user.id;
});

afterEach(async () => {
  await prisma.providerKey.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await prisma.$disconnect();
});

function addKey(provider: string) {
  return createProviderKey({
    userId,
    provider,
    label: "Default",
    encryptedKey: encryptSecret("test-key"),
    baseUrl: null,
    config: {},
  });
}

describe("getEmbeddingResolveInputForUser", () => {
  it("throws embeddings_unsupported when no provider is connected", async () => {
    await expect(getEmbeddingResolveInputForUser(userId)).rejects.toMatchObject({
      code: "embeddings_unsupported",
    });
  });

  it("throws embeddings_unsupported when only a non-embedding provider is connected", async () => {
    await addKey("anthropic");
    await expect(getEmbeddingResolveInputForUser(userId)).rejects.toMatchObject({
      code: "embeddings_unsupported",
    });
  });

  it("picks google when only google is connected", async () => {
    await addKey("google");
    const input = await getEmbeddingResolveInputForUser(userId);
    expect(input.provider).toBe("google");
    expect(input.apiKey).toBe("test-key");
  });

  it("prefers openai over google when both are connected", async () => {
    await addKey("google");
    await addKey("openai");
    const input = await getEmbeddingResolveInputForUser(userId);
    expect(input.provider).toBe("openai");
  });
});
