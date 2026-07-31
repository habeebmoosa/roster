import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { encryptSecret } from "@/server/crypto/vault";
import {
  createProviderKey,
  deleteProviderKeyById,
  getDefaultProviderKey,
  listCredentialsForProvider,
  listDefaultProviderKeys,
  setDefaultProviderKey,
  updateProviderKey,
} from "@/server/db/repositories/provider-key.repository";
import { prisma } from "@/server/db/prisma";

/**
 * Multi-credential-per-provider repository behavior (10.9 Phase 1): default
 * auto-assignment, the transactional default swap, and delete's
 * promote-the-next-most-recent-remaining-credential rule.
 */
let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `provider-credentials-${Date.now()}@test.local` },
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

function makeCredential(overrides: { label: string; makeDefault?: boolean }) {
  return createProviderKey({
    userId,
    provider: "openai",
    label: overrides.label,
    encryptedKey: encryptSecret("fake-key"),
    baseUrl: null,
    config: {},
    makeDefault: overrides.makeDefault,
  });
}

describe("createProviderKey — default assignment", () => {
  it("makes the first credential for a provider the default automatically", async () => {
    const first = await makeCredential({ label: "Personal" });
    expect(first.isDefault).toBe(true);
  });

  it("does not default a second credential unless makeDefault is set", async () => {
    const first = await makeCredential({ label: "Personal" });
    const second = await makeCredential({ label: "Work" });

    expect(first.isDefault).toBe(true);
    expect(second.isDefault).toBe(false);

    const stillDefault = await getDefaultProviderKey(userId, "openai");
    expect(stillDefault?.label).toBe("Personal");
  });

  it("unsets the previous default when a new credential is created with makeDefault", async () => {
    await makeCredential({ label: "Personal" });
    const second = await makeCredential({ label: "Work", makeDefault: true });

    expect(second.isDefault).toBe(true);
    const credentials = await listCredentialsForProvider(userId, "openai");
    const personal = credentials.find((c) => c.label === "Personal");
    expect(personal?.isDefault).toBe(false);
  });
});

describe("setDefaultProviderKey", () => {
  it("swaps the default to the chosen credential, unsetting every other one", async () => {
    const first = await makeCredential({ label: "Personal" });
    const second = await makeCredential({ label: "Work" });

    await setDefaultProviderKey(userId, "openai", second.id);

    const credentials = await listCredentialsForProvider(userId, "openai");
    expect(credentials.find((c) => c.id === second.id)?.isDefault).toBe(true);
    expect(credentials.find((c) => c.id === first.id)?.isDefault).toBe(false);
  });
});

describe("deleteProviderKeyById", () => {
  it("promotes the most recently created remaining credential when the default is deleted", async () => {
    const first = await makeCredential({ label: "Personal" });
    await new Promise((r) => setTimeout(r, 5)); // ensure distinct createdAt ordering
    const second = await makeCredential({ label: "Work" });
    await new Promise((r) => setTimeout(r, 5));
    const third = await makeCredential({ label: "Staging" });
    void third;

    await deleteProviderKeyById(userId, first.id);

    const remaining = await listCredentialsForProvider(userId, "openai");
    expect(remaining).toHaveLength(2);
    // Most recently created remaining credential ("Staging") is promoted.
    const newDefault = remaining.find((c) => c.isDefault);
    expect(newDefault?.label).toBe("Staging");
    void second;
  });

  it("leaves the provider unconfigured after deleting its last credential", async () => {
    const only = await makeCredential({ label: "Solo" });
    await deleteProviderKeyById(userId, only.id);

    expect(await getDefaultProviderKey(userId, "openai")).toBeNull();
    expect(await listCredentialsForProvider(userId, "openai")).toHaveLength(0);
    expect(await listDefaultProviderKeys(userId)).toHaveLength(0);
  });

  it("does nothing if the credential doesn't exist or isn't owned by this user", async () => {
    const first = await makeCredential({ label: "Personal" });
    await deleteProviderKeyById(userId, "not-a-real-id");

    expect(await getDefaultProviderKey(userId, "openai")).toMatchObject({ id: first.id });
  });
});

describe("updateProviderKey", () => {
  it("keeps the existing secret when no new one is supplied", async () => {
    const created = await makeCredential({ label: "Personal" });
    const before = await prisma.providerKey.findUniqueOrThrow({ where: { id: created.id } });

    await updateProviderKey(userId, created.id, { label: "Renamed", config: { region: "us-east-1" } });

    const after = await prisma.providerKey.findUniqueOrThrow({ where: { id: created.id } });
    expect(after.encryptedKey).toBe(before.encryptedKey);
    expect(after.label).toBe("Renamed");
    expect(after.config).toEqual({ region: "us-east-1" });
  });

  it("returns null for a credential that doesn't exist or isn't owned by this user", async () => {
    expect(await updateProviderKey(userId, "not-a-real-id", { label: "X" })).toBeNull();
  });
});

describe("listDefaultProviderKeys", () => {
  it("returns exactly one row per configured provider, never a non-default one", async () => {
    await makeCredential({ label: "Personal" });
    await makeCredential({ label: "Work" });
    await createProviderKey({
      userId,
      provider: "anthropic",
      label: "Default",
      encryptedKey: encryptSecret("fake-key"),
      baseUrl: null,
      config: {},
    });

    const defaults = await listDefaultProviderKeys(userId);
    expect(defaults).toHaveLength(2); // one per provider (openai, anthropic), not 3
    expect(defaults.every((d) => d.isDefault)).toBe(true);
  });
});
