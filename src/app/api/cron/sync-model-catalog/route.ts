import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";
import { syncModelCatalogFromModelsDev } from "@/server/models/sync-service";

export const runtime = "nodejs";
// Fetches models.dev once (~3MB) and upserts ~1000 models across every
// provider — comfortably under Vercel's cron-route duration budget.
export const maxDuration = 60;

export async function GET(req: Request) {
  if (env.CRON_SECRET) {
    const authorization = req.headers.get("authorization");
    if (authorization !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const results = await syncModelCatalogFromModelsDev();
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
