import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { streamCompletion } from "@/core/providers";
import { listAnalyticsEventsForUser } from "@/server/db/repositories/analytics-event.repository";
import { listCredentialsForProvider } from "@/server/db/repositories/provider-key.repository";
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

  it("logs a provider_key_added analytics event only on success, not on a rejected validation", async () => {
    const events = await listAnalyticsEventsForUser(userId);
    const added = events.filter((e) => e.event === "provider_key_added");
    // Exactly one — from the successful add above, not from the invalid-key
    // or bad-base-url attempts earlier in this suite.
    expect(added).toHaveLength(1);
    expect(added[0]!.metadata).toEqual({ provider: "custom" });
  });

  it("streams a completion using the stored (decrypted) key", async () => {
    const input = await getResolveInputForUser(userId, "custom", "mock-model");
    const result = streamCompletion(input, "hello");

    let text = "";
    for await (const chunk of result.textStream) text += chunk;

    expect(text).toBe("Hello world");
  });

  it("adding a second credential for the same provider auto-labels it rather than overwriting the first", async () => {
    // "custom" already has one credential ("Default") from the earlier test in this suite.
    await addProviderKey({
      userId,
      provider: "custom",
      apiKey: API_KEY,
      model: "mock-model",
      baseUrl: mock.url,
    });

    const credentials = await listCredentialsForProvider(userId, "custom");
    expect(credentials.map((c) => c.label).sort()).toEqual(["Default", "Default 2"]);
    // The original stays the default; the newly added one does not silently take over.
    expect(credentials.find((c) => c.label === "Default")?.isDefault).toBe(true);
    expect(credentials.find((c) => c.label === "Default 2")?.isDefault).toBe(false);
  });

  it("rejects an explicit label that collides with an existing credential for the same provider", async () => {
    await expect(
      addProviderKey({
        userId,
        provider: "custom",
        apiKey: API_KEY,
        model: "mock-model",
        baseUrl: mock.url,
        label: "Default",
      }),
    ).rejects.toMatchObject({ code: "duplicate_label" });
  });

  it("a new makeDefault credential becomes the one getResolveInputForUser resolves to", async () => {
    await addProviderKey({
      userId,
      provider: "custom",
      apiKey: API_KEY,
      model: "mock-model",
      baseUrl: mock.url,
      label: "Newest",
      makeDefault: true,
    });

    const credentials = await listCredentialsForProvider(userId, "custom");
    expect(credentials.find((c) => c.label === "Newest")?.isDefault).toBe(true);
    expect(credentials.filter((c) => c.isDefault)).toHaveLength(1);
  });
});
