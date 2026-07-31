import type { McpServerDefinition } from "@/core/mcp/directory";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/server/db/prisma";

/** A tool or resource name+description pair — the pre-connection capability snapshot shown in the Connectors UI, before a real tools/list or resources/list call has ever run. */
export interface CachedCapability {
  name: string;
  description: string;
}

export interface McpServerRecord {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  developer: string | null;
  connectorUrl: string;
  authType: string;
  categories: string[];
  trustTier: string;
  cachedTools: CachedCapability[];
  cachedResources: CachedCapability[];
  documentationUrl: string | null;
  supportUrl: string | null;
  privacyPolicyUrl: string | null;
  preRegisteredClientId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
}

const asCapabilityList = (value: Prisma.JsonValue | null): CachedCapability[] =>
  Array.isArray(value) ? (value as unknown as CachedCapability[]) : [];

function toRecord(row: {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  developer: string | null;
  connectorUrl: string;
  authType: string;
  categories: string[];
  trustTier: string;
  cachedTools: Prisma.JsonValue;
  cachedResources: Prisma.JsonValue;
  documentationUrl: string | null;
  supportUrl: string | null;
  privacyPolicyUrl: string | null;
  preRegisteredClientId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
}): McpServerRecord {
  return {
    ...row,
    cachedTools: asCapabilityList(row.cachedTools),
    cachedResources: asCapabilityList(row.cachedResources),
  };
}

export async function listMcpServers(): Promise<McpServerRecord[]> {
  const rows = await prisma.mcpServer.findMany({ orderBy: { name: "asc" } });
  return rows.map(toRecord);
}

export async function getMcpServer(id: string): Promise<McpServerRecord | null> {
  const row = await prisma.mcpServer.findUnique({ where: { id } });
  return row ? toRecord(row) : null;
}

/** Seeds/updates a curated directory entry from its definition file (prisma/seed.ts). */
export async function upsertMcpServerFromDefinition(
  definition: McpServerDefinition,
): Promise<void> {
  const vendorMetadata = {
    name: definition.name,
    description: definition.description,
    iconUrl: definition.iconUrl ?? null,
    developer: definition.developer ?? null,
    connectorUrl: definition.connectorUrl,
    authType: definition.authType,
    categories: definition.categories,
    trustTier: definition.trustTier,
    documentationUrl: definition.documentationUrl ?? null,
    supportUrl: definition.supportUrl ?? null,
    privacyPolicyUrl: definition.privacyPolicyUrl ?? null,
  };
  await prisma.mcpServer.upsert({
    where: { id: definition.id },
    // The hand-curated tools/resources snapshot is only a pre-connect preview
    // (mcp-servers/README.md) — set it on first insert, but never overwrite it
    // on a re-seed, since by then a real connect may have replaced it with the
    // server's actual live tools/list + resources/list result (see
    // updateMcpServerCapabilities) and a re-seed must not clobber that.
    create: {
      id: definition.id,
      ...vendorMetadata,
      cachedTools: definition.tools as unknown as Prisma.InputJsonValue,
      cachedResources: definition.resources as unknown as Prisma.InputJsonValue,
    },
    update: vendorMetadata,
  });
}

/** Overwrites the cached capability snapshot with a live tools/list + resources/list result (10.7, on connect). */
export async function updateMcpServerCapabilities(
  id: string,
  cachedTools: CachedCapability[],
  cachedResources: CachedCapability[],
): Promise<void> {
  await prisma.mcpServer.update({
    where: { id },
    data: {
      cachedTools: cachedTools as unknown as Prisma.InputJsonValue,
      cachedResources: cachedResources as unknown as Prisma.InputJsonValue,
    },
  });
}

export interface RegisteredOAuthClient {
  clientId: string;
  encryptedClientSecret: string | null;
}

/** A dynamically-registered OAuth client is shared across every Roster user connecting to this server — only the resulting per-user tokens (McpConnection) differ. */
export async function getRegisteredOAuthClient(id: string): Promise<RegisteredOAuthClient | null> {
  const row = await prisma.mcpServer.findUnique({
    where: { id },
    select: { preRegisteredClientId: true, encryptedPreRegisteredSecret: true },
  });
  if (!row?.preRegisteredClientId) return null;
  return {
    clientId: row.preRegisteredClientId,
    encryptedClientSecret: row.encryptedPreRegisteredSecret,
  };
}

/** Caches a Dynamic Client Registration result on the server row so later connects (by any user) skip re-registering. */
export async function saveRegisteredOAuthClient(
  id: string,
  clientId: string,
  encryptedClientSecret: string | null,
): Promise<void> {
  await prisma.mcpServer.update({
    where: { id },
    data: { preRegisteredClientId: clientId, encryptedPreRegisteredSecret: encryptedClientSecret },
  });
}

export interface CreateCustomMcpServerInput {
  id: string;
  name: string;
  description: string;
  connectorUrl: string;
  authType: string;
  categories: string[];
  createdByUserId: string;
}

export async function createCustomMcpServer(
  input: CreateCustomMcpServerInput,
): Promise<McpServerRecord> {
  const row = await prisma.mcpServer.create({
    data: {
      id: input.id,
      name: input.name,
      description: input.description,
      connectorUrl: input.connectorUrl,
      authType: input.authType,
      categories: input.categories,
      trustTier: "custom",
      createdByUserId: input.createdByUserId,
    },
  });
  return toRecord(row);
}
