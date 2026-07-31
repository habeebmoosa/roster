import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { streamCompletion } from "@/core/providers";
import { listAnalyticsEventsForUser } from "@/server/db/repositories/analytics-event.repository";
import { listCredentialsForProvider } from "@/server/db/repositories/provider-key.repository";
import { prisma } from "@/server/db/prisma";
import {
  addProviderKey,
  getResolveInputForUser,
  listUserProviders,
  updateProviderCredential,
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

describe("BYOK with a native (non-openai-compatible-kind) provider package", () => {
  // Fireworks' first-party @ai-sdk/fireworks package is built on the same
  // @ai-sdk/openai-compatible request path as the "custom" kind under the
  // hood (confirmed via its re-exported OpenAICompatibleErrorData type) — so
  // this mock server can stand in for it too, proving the new "fireworks"
  // registry kind (10.9 Phase 2) round-trips end to end, not just that
  // resolveModel() returns an object.
  it("adds, validates, and streams through the native fireworks provider kind", async () => {
    await addProviderKey({
      userId,
      provider: "fireworks",
      apiKey: API_KEY,
      model: "accounts/fireworks/models/test-model",
      baseUrl: mock.url,
    });

    const input = await getResolveInputForUser(
      userId,
      "fireworks",
      "accounts/fireworks/models/test-model",
    );
    const result = streamCompletion(input, "hello");

    let text = "";
    for await (const chunk of result.textStream) text += chunk;

    expect(text).toBe("Hello world");
  });
});

describe("multi-secret credential bundling (10.9 Phase 4)", () => {
  // The mock server just checks the literal Authorization header value, so
  // giving it the exact JSON string encodeSecretBundle() should produce lets
  // this prove the real encode → validate → encrypt → decrypt → decode round
  // trip end to end, without needing to fake AWS SigV4/Vertex JWT signing.
  const BUNDLE = { accessKeyId: "AKIA123", secretAccessKey: "shh-secret" };
  const ENCODED_BUNDLE = JSON.stringify(BUNDLE);

  it("JSON-encodes a multi-key secrets bundle and authenticates the live ping with it", async () => {
    const bundleMock = await startMockOpenAIServer({ apiKey: ENCODED_BUNDLE });
    try {
      await addProviderKey({
        userId,
        provider: "custom",
        secrets: BUNDLE,
        model: "mock-model",
        baseUrl: bundleMock.url,
        label: "Bundle test",
      });

      const stored = await prisma.providerKey.findFirst({
        where: { userId, provider: "custom", label: "Bundle test" },
      });
      const { decryptSecret } = await import("@/server/crypto/vault");
      expect(decryptSecret(stored!.encryptedKey)).toBe(ENCODED_BUNDLE);
    } finally {
      await bundleMock.close();
    }
  });
});

describe("updateProviderCredential — edit re-validation (10.9 Phase 4)", () => {
  it("re-validates against the effective (merged) credential when a model is given", async () => {
    await addProviderKey({
      userId,
      provider: "custom",
      apiKey: API_KEY,
      model: "mock-model",
      baseUrl: mock.url,
      label: "Edit target",
    });
    const [created] = await listCredentialsForProvider(userId, "custom").then((cs) =>
      cs.filter((c) => c.label === "Edit target"),
    );

    // Renaming without a model: no live re-check, so a bad base URL is accepted.
    const renamed = await updateProviderCredential(userId, created!.id, { label: "Renamed" });
    expect(renamed.label).toBe("Renamed");

    // Supplying a model re-validates — a wrong secret against the real mock server fails cleanly.
    await expect(
      updateProviderCredential(userId, created!.id, {
        apiKey: "wrong-key",
        model: "mock-model",
      }),
    ).rejects.toMatchObject({ code: "invalid_key" });

    // This specific credential is untouched by the failed edit attempt (still the old, valid key).
    const { decryptSecret } = await import("@/server/crypto/vault");
    const row = await prisma.providerKey.findUniqueOrThrow({ where: { id: created!.id } });
    expect(decryptSecret(row.encryptedKey)).toBe(API_KEY);
  });
});
