import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/server/db/prisma";

/** Safe projection — never includes the encrypted key. */
export interface ProviderKeyRecord {
  id: string;
  provider: string;
  label: string;
  isDefault: boolean;
  baseUrl: string | null;
  config: Record<string, unknown>;
  createdAt: Date;
}

/** Full record including the encrypted key — only for request-time decryption. */
export interface ProviderKeyWithSecret extends ProviderKeyRecord {
  encryptedKey: string;
}

export interface CreateProviderKeyInput {
  userId: string;
  provider: string;
  label: string;
  encryptedKey: string;
  baseUrl?: string | null;
  config?: Record<string, unknown>;
  /** Force this to be the provider's default even if other credentials already exist. */
  makeDefault?: boolean;
}

export interface UpdateProviderKeyInput {
  label?: string;
  /** Omit to keep the existing secret unchanged (the edit flow shouldn't force re-entering an unchanged key). */
  encryptedKey?: string;
  baseUrl?: string | null;
  config?: Record<string, unknown>;
}

const SAFE_SELECT = {
  id: true,
  provider: true,
  label: true,
  isDefault: true,
  baseUrl: true,
  config: true,
  createdAt: true,
} as const;

const asConfig = (value: Prisma.JsonValue | null): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

function toRecord(row: {
  id: string;
  provider: string;
  label: string;
  isDefault: boolean;
  baseUrl: string | null;
  config: Prisma.JsonValue;
  createdAt: Date;
}): ProviderKeyRecord {
  return { ...row, config: asConfig(row.config) };
}

function toWithSecret(row: {
  id: string;
  provider: string;
  label: string;
  isDefault: boolean;
  baseUrl: string | null;
  config: Prisma.JsonValue;
  createdAt: Date;
  encryptedKey: string;
}): ProviderKeyWithSecret {
  return { ...toRecord(row), encryptedKey: row.encryptedKey };
}

/**
 * One row per configured provider — that provider's current default
 * credential. Everything outside Settings (chat, hire wizard, model
 * resolution) reads through this, so nothing downstream needs to know a
 * provider might have more than one credential configured.
 */
export async function listDefaultProviderKeys(userId: string): Promise<ProviderKeyRecord[]> {
  const rows = await prisma.providerKey.findMany({
    where: { userId, isDefault: true },
    select: SAFE_SELECT,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRecord);
}

/** Every credential configured for one provider — for the Settings "manage credentials" view. */
export async function listCredentialsForProvider(
  userId: string,
  provider: string,
): Promise<ProviderKeyRecord[]> {
  const rows = await prisma.providerKey.findMany({
    where: { userId, provider },
    select: SAFE_SELECT,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRecord);
}

/** The credential runAgent()/chat/REST/eval actually use for this provider. */
export async function getDefaultProviderKey(
  userId: string,
  provider: string,
): Promise<ProviderKeyWithSecret | null> {
  const row = await prisma.providerKey.findFirst({ where: { userId, provider, isDefault: true } });
  return row ? toWithSecret(row) : null;
}

/** A specific credential by id (ownership-checked) — for edit/delete/set-default. */
export async function getProviderKeyById(
  userId: string,
  id: string,
): Promise<ProviderKeyWithSecret | null> {
  const row = await prisma.providerKey.findFirst({ where: { id, userId } });
  return row ? toWithSecret(row) : null;
}

/**
 * Adds a new credential for a provider. The first credential for a (user,
 * provider) pair is automatically the default; later ones stay non-default
 * unless `makeDefault` is set — in which case every existing credential for
 * that provider is unset first, in the same transaction.
 */
export async function createProviderKey(input: CreateProviderKeyInput): Promise<ProviderKeyRecord> {
  return prisma.$transaction(async (tx) => {
    const existingCount = await tx.providerKey.count({
      where: { userId: input.userId, provider: input.provider },
    });
    const isDefault = existingCount === 0 || Boolean(input.makeDefault);
    if (isDefault && existingCount > 0) {
      await tx.providerKey.updateMany({
        where: { userId: input.userId, provider: input.provider },
        data: { isDefault: false },
      });
    }
    const row = await tx.providerKey.create({
      data: {
        userId: input.userId,
        provider: input.provider,
        label: input.label,
        isDefault,
        encryptedKey: input.encryptedKey,
        baseUrl: input.baseUrl ?? null,
        config: (input.config ?? {}) as Prisma.InputJsonValue,
      },
      select: SAFE_SELECT,
    });
    return toRecord(row);
  });
}

/** Updates a credential in place. Returns null if it doesn't exist or isn't owned by this user. */
export async function updateProviderKey(
  userId: string,
  id: string,
  input: UpdateProviderKeyInput,
): Promise<ProviderKeyRecord | null> {
  const existing = await prisma.providerKey.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const data: Prisma.ProviderKeyUpdateInput = {};
  if (input.label !== undefined) data.label = input.label;
  if (input.encryptedKey !== undefined) data.encryptedKey = input.encryptedKey;
  if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl;
  if (input.config !== undefined) data.config = input.config as Prisma.InputJsonValue;

  const row = await prisma.providerKey.update({ where: { id }, data, select: SAFE_SELECT });
  return toRecord(row);
}

/** Marks one credential as its provider's default, unsetting any other, in one transaction. */
export async function setDefaultProviderKey(
  userId: string,
  provider: string,
  id: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.providerKey.updateMany({ where: { userId, provider }, data: { isDefault: false } }),
    prisma.providerKey.update({ where: { id }, data: { isDefault: true } }),
  ]);
}

/**
 * Deletes one credential. If it was the provider's default and others remain,
 * promotes the most recently created remaining one to default so the
 * provider is never left with configured credentials but no default.
 */
export async function deleteProviderKeyById(userId: string, id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const target = await tx.providerKey.findFirst({ where: { id, userId } });
    if (!target) return;

    await tx.providerKey.delete({ where: { id } });

    if (target.isDefault) {
      const next = await tx.providerKey.findFirst({
        where: { userId, provider: target.provider },
        orderBy: { createdAt: "desc" },
      });
      if (next) await tx.providerKey.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
}

/** Deletes every credential configured for a provider — today's "remove provider" action. */
export async function deleteAllCredentialsForProvider(
  userId: string,
  provider: string,
): Promise<void> {
  await prisma.providerKey.deleteMany({ where: { userId, provider } });
}
