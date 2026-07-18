import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { streamCompletion } from "@/core/providers";
import { prisma } from "@/server/db/prisma";
import {
  addProviderKey,
  getResolveInputForUser,
  listUserProviders,
} from "@/server/providers/service";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * End-to-end BYOK proof, fully offline: add a key (validated against a mock
 * OpenAI-compatible provider) → stored encrypted → stream a completion with it.
 * Also exercises the error taxonomy (invalid key, bad base URL).
 */
const API_KEY = "test-key-123";
let mock: MockServer;
let userId: string;

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
  const user = await prisma.user.create({ data: { email: `byok-${Date.now()}@test.local` } });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await mock.close();
  await prisma.$disconnect();
});

describe("BYOK provider service (mock provider)", () => {
  it("rejects an invalid key during the validation ping", async () => {
    await expect(
      addProviderKey({
        userId,
        provider: "custom",
        apiKey: "wrong-key",
        model: "mock-model",
        baseUrl: mock.url,
      }),
    ).rejects.toMatchObject({ code: "invalid_key" });

    expect(await listUserProviders(userId)).toHaveLength(0);
  });

  it("maps an unreachable base URL to bad_base_url", async () => {
    await expect(
      addProviderKey({
        userId,
        provider: "custom",
        apiKey: API_KEY,
        model: "mock-model",
        baseUrl: "http://127.0.0.1:1/v1",
      }),
    ).rejects.toMatchObject({ code: "bad_base_url" });
  });

  it("validates and stores the key encrypted (never plaintext)", async () => {
    await addProviderKey({
      userId,
      provider: "custom",
      apiKey: API_KEY,
      model: "mock-model",
      baseUrl: mock.url,
    });

    const keys = await listUserProviders(userId);
    expect(keys).toHaveLength(1);
    expect(keys[0]?.provider).toBe("custom");

    const row = await prisma.providerKey.findFirst({ where: { userId } });
    expect(row?.encryptedKey).toBeTruthy();
    expect(row?.encryptedKey).not.toContain(API_KEY);
  });

  it("streams a completion using the stored (decrypted) key", async () => {
    const input = await getResolveInputForUser(userId, "custom", "mock-model");
    const result = streamCompletion(input, "hello");

    let text = "";
    for await (const chunk of result.textStream) text += chunk;

    expect(text).toBe("Hello world");
  });
});
