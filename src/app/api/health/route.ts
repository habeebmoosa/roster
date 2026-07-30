import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

// Prisma requires the Node.js runtime; always run fresh (never cached).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthChecks {
  db: boolean;
  pgvector: boolean;
}

/**
 * Liveness/readiness probe. Verifies database connectivity AND that the
 * pgvector extension is installed and its operators actually work.
 */
export async function GET() {
  const checks: HealthChecks = { db: false, pgvector: false };
  let pgvectorVersion: string | null = null;
  let error: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;

    const rows = await prisma.$queryRaw<Array<{ extversion: string }>>`
      SELECT extversion FROM pg_extension WHERE extname = 'vector'
    `;
    const version = rows[0]?.extversion;
    if (version) {
      // Prove the operator actually resolves, not just that the row exists.
      await prisma.$queryRaw`SELECT '[1,0,0]'::vector <=> '[0,1,0]'::vector AS distance`;
      checks.pgvector = true;
      pgvectorVersion = version;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "unknown error";
  }

  const ok = checks.db && checks.pgvector;
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      checks,
      pgvectorVersion,
      error,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
