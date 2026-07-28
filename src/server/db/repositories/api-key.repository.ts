import { prisma } from "@/server/db/prisma";
import { generateApiKey, hashApiKey, type GeneratedApiKey } from "@/server/crypto/api-key";

export interface ApiKeySummary {
  id: string;
  label: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

const SUMMARY_SELECT = {
  id: true,
  label: true,
  keyPrefix: true,
  lastUsedAt: true,
  createdAt: true,
  revokedAt: true,
} as const;

/** Every API key a user has created, revoked or not, newest first. Never includes the raw key or hash. */
export function listApiKeys(userId: string): Promise<ApiKeySummary[]> {
  return prisma.apiKey.findMany({
    where: { userId },
    select: SUMMARY_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

/** Generates a new raw key, persists only its hash + display prefix, and returns the raw key for one-time display. */
export async function createApiKey(
  userId: string,
  label: string,
): Promise<{ summary: ApiKeySummary; rawKey: GeneratedApiKey["rawKey"] }> {
  const { rawKey, keyPrefix, hashedKey } = generateApiKey();
  const summary = await prisma.apiKey.create({
    data: { userId, label, keyPrefix, hashedKey },
    select: SUMMARY_SELECT,
  });
  return { summary, rawKey };
}

/** Revokes a key, scoped to its owner. A no-op if the key doesn't exist, isn't owned by `userId`, or is already revoked. */
export async function revokeApiKey(userId: string, id: string): Promise<void> {
  await prisma.apiKey.updateMany({
    where: { id, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Auth path (Phase 12.2): hashes `rawKey` and looks up an active, non-revoked key. Returns null for unknown or revoked keys. */
export async function findActiveApiKeyByRawKey(
  rawKey: string,
): Promise<{ id: string; userId: string } | null> {
  const row = await prisma.apiKey.findUnique({
    where: { hashedKey: hashApiKey(rawKey) },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (!row || row.revokedAt) return null;
  return { id: row.id, userId: row.userId };
}

export async function touchApiKeyLastUsed(id: string): Promise<void> {
  await prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } });
}
