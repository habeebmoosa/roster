import { prisma } from "@/server/db/prisma";

/** Safe projection — never includes the encrypted credentials. */
export interface McpConnectionSummary {
  id: string;
  mcpServerId: string;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
}

/** Full record including encrypted credentials — only for request-time decryption. */
export interface McpConnectionWithSecret extends McpConnectionSummary {
  credentials: string;
}

export interface UpsertMcpConnectionInput {
  userId: string;
  mcpServerId: string;
  credentials: string;
  status?: string;
  expiresAt?: Date | null;
}

export async function listMcpConnections(userId: string): Promise<McpConnectionSummary[]> {
  return prisma.mcpConnection.findMany({
    where: { userId },
    select: { id: true, mcpServerId: true, status: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getMcpConnectionWithSecret(
  userId: string,
  mcpServerId: string,
): Promise<McpConnectionWithSecret | null> {
  return prisma.mcpConnection.findUnique({
    where: { userId_mcpServerId: { userId, mcpServerId } },
    select: {
      id: true,
      mcpServerId: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      credentials: true,
    },
  });
}

/** Create a connection, or replace its credentials/status if one already exists for this (user, server). */
export async function upsertMcpConnection(
  input: UpsertMcpConnectionInput,
): Promise<McpConnectionSummary> {
  const data = {
    credentials: input.credentials,
    status: input.status ?? "active",
    expiresAt: input.expiresAt ?? null,
  };
  return prisma.mcpConnection.upsert({
    where: { userId_mcpServerId: { userId: input.userId, mcpServerId: input.mcpServerId } },
    create: { userId: input.userId, mcpServerId: input.mcpServerId, ...data },
    update: data,
    select: { id: true, mcpServerId: true, status: true, expiresAt: true, createdAt: true },
  });
}

/** Persists a refreshed credential blob without touching status/expiresAt (used after a proactive/reactive OAuth refresh). */
export async function updateMcpConnectionCredentials(
  userId: string,
  mcpServerId: string,
  credentials: string,
): Promise<void> {
  await prisma.mcpConnection.update({
    where: { userId_mcpServerId: { userId, mcpServerId } },
    data: { credentials },
  });
}

export async function deleteMcpConnection(userId: string, mcpServerId: string): Promise<void> {
  await prisma.mcpConnection.deleteMany({ where: { userId, mcpServerId } });
}
