import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/server/db/prisma";

/** Safe projection — never includes the encrypted key. */
export interface ProviderKeyRecord {
  id: string;
  provider: string;
  label: string | null;
  baseUrl: string | null;
  config: Record<string, unknown>;
  createdAt: Date;
}

/** Full record including the encrypted key — only for request-time decryption. */
export interface ProviderKeyWithSecret extends ProviderKeyRecord {
  encryptedKey: string;
}

export interface UpsertProviderKeyInput {
  userId: string;
  provider: string;
  label?: string | null;
  encryptedKey: string;
  baseUrl?: string | null;
  config?: Record<string, unknown>;
}

const asConfig = (value: Prisma.JsonValue | null): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export async function listProviderKeys(userId: string): Promise<ProviderKeyRecord[]> {
  const rows = await prisma.providerKey.findMany({
    where: { userId },
    select: { id: true, provider: true, label: true, baseUrl: true, config: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({ ...row, config: asConfig(row.config) }));
}

/** Create or replace the config for (user, provider). */
export async function upsertProviderKey(input: UpsertProviderKeyInput): Promise<ProviderKeyRecord> {
  const data = {
    label: input.label ?? null,
    encryptedKey: input.encryptedKey,
    baseUrl: input.baseUrl ?? null,
    config: (input.config ?? {}) as Prisma.InputJsonValue,
  };
  const row = await prisma.providerKey.upsert({
    where: { userId_provider: { userId: input.userId, provider: input.provider } },
    create: { userId: input.userId, provider: input.provider, ...data },
    update: data,
    select: { id: true, provider: true, label: true, baseUrl: true, config: true, createdAt: true },
  });
  return { ...row, config: asConfig(row.config) };
}

/** Full record (with encrypted key) for a single provider — request-time use only. */
export async function getProviderKeyWithSecret(
  userId: string,
  provider: string,
): Promise<ProviderKeyWithSecret | null> {
  const row = await prisma.providerKey.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!row) return null;
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    baseUrl: row.baseUrl,
    config: asConfig(row.config),
    createdAt: row.createdAt,
    encryptedKey: row.encryptedKey,
  };
}

export async function deleteProviderKey(userId: string, provider: string): Promise<void> {
  await prisma.providerKey.deleteMany({ where: { userId, provider } });
}
