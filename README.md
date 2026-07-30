# Roster

Hireable, specialized **AI employees** that perform like experts on _any_ LLM you bring —
because the expertise is engineered into the agent, not the model.

See [`Product-Overview.md`](./Product-Overview.md) for the pitch, [`MVP-Plan.md`](./MVP-Plan.md)
for the full build plan, and [`CLAUDE.md`](./CLAUDE.md) for a quick orientation.

> **Status: Phase 13 — Polish & ship (private beta).** Phases 1–12 complete
> (BYOK, the agent engine, memory/retrieval, tools, chat, the REST API); Phase
> 13 sub-phases 13.1–13.5 done, 13.6 (final verification sweep) next. See
> [`MVP-Plan.md`](./MVP-Plan.md) §8 for the full phase-by-phase detail.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript** (strict)
- **PostgreSQL + pgvector**, provider-agnostic (any Postgres via `DATABASE_URL`)
- **Prisma** for the client + migrations
- **Tailwind CSS v4** only (hand-rolled UI kit, no component library)
- **Zod** for env/input validation
- **Vitest** (unit + integration) + **Playwright** (e2e)

## Prerequisites

- Node.js 22+
- Docker (for the local Postgres + pgvector), or any reachable Postgres with `pgvector`

## Quick start

```bash
# 1. Install
npm install

# 2. Configure — copy the example and fill in the values
cp .env.example .env
#    - AUTH_SECRET:  openssl rand -base64 33
#    - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: from the Google Cloud console,
#      with redirect URI  http://localhost:3005/api/auth/callback/google

# 3. Start the local database (Postgres 16 + pgvector)
npm run db:up

# 4. Apply migrations (enables pgvector + creates tables)
npm run db:migrate

# 5. Run the app
npm run dev
```

Then open http://localhost:3005 and check http://localhost:3005/api/health — it should report
`{ "status": "ok", "checks": { "db": true, "pgvector": true } }`.

## Using a different Postgres

The database is fully configurable — point `DATABASE_URL` (and `DIRECT_URL` for migrations) at
any Postgres (self-hosted on EC2, Supabase, Neon, RDS, …). The only requirement is that the
`pgvector` extension can be installed. No code changes needed.

> The local Docker Postgres is published on host port **5434** (not 5432) so it
> won't clash with any Postgres you already run locally.

## Deploying (Vercel + Supabase)

### Database — Supabase

1. Create a Supabase project, then enable the `vector` extension (Database →
   Extensions → search "vector" → Enable).
2. Set `DATABASE_URL` to Supabase's **pooled** connection string (the
   "Transaction" pooler, port `6543`), with `?pgbouncer=true` appended.
   Vercel's serverless functions each open their own DB connection — without
   pooling, a burst of concurrent requests exhausts Supabase's connection
   limit fast.
3. Set `DIRECT_URL` to Supabase's **direct** connection string (port `5432`,
   no pooler). Migrations need a real, non-pooled connection — some
   migration operations aren't compatible with PgBouncer's transaction mode.
4. Run migrations against the real database once, from your machine or CI —
   **`npx prisma migrate deploy`**, never `migrate dev` outside local
   development.

### App — Vercel

1. Import the repo; the Next.js preset is auto-detected, no build config
   needed.
2. Set every required env var (checklist below) in the project's
   Environment Variables settings.
3. Function duration: the two streaming routes (`/api/chat`,
   `/api/v1/agents/{id}/chat`) are set to `maxDuration = 60`; three more that
   each make one outbound call to a third party you don't control
   (`/api/providers`, the MCP OAuth start/callback routes) are set to `30`.
   Every other route is plain DB CRUD and needs no override. Note: Vercel's
   Hobby plan caps every function at 60s regardless of what's configured —
   Pro allows higher.
4. Sentry source-map upload (optional but recommended): set `SENTRY_ORG` /
   `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` as env vars. The build plugin reads
   them itself; without them the build still succeeds, just without
   source-mapped stack traces in Sentry.

### Env/secrets checklist

**Required** (the app won't boot without these — see `src/lib/env.ts`):

- `DATABASE_URL`, `DIRECT_URL` — Supabase, see above
- `AUTH_SECRET` — `openssl rand -base64 33`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — add the production callback
  URL (`https://<your-domain>/api/auth/callback/google`) in the Google Cloud
  console
- `ENCRYPTION_KEY` — `openssl rand -base64 32` (BYOK vault). **Back this up
  somewhere durable** — losing or rotating it makes every already-stored
  provider key permanently undecryptable.

**Optional:**

- `AUTH_URL` — Auth.js infers it in dev; set it explicitly in production
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — shared rate
  limiting across instances. Without these, rate limiting falls back to an
  in-memory limiter that's per-instance and resets on every redeploy — fine
  for a single-region low-traffic beta, not correct once you run more than
  one instance.
- `NEXT_PUBLIC_SENTRY_DSN` — error tracking; Sentry silently no-ops without
  it
- `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` — CI-only, source-map
  upload
- `EVAL_*` — CLI-only (`npm run eval`), not read by the deployed app itself

### Post-deploy check

- Visit `/api/health` — expect
  `{ "status": "ok", "checks": { "db": true, "pgvector": true } }`.
- Sign in → add a provider key (validates + persists) → hire an employee →
  send a chat message. That's the full path exercised end to end.

## Scripts

| Script                                     | What it does                               |
| ------------------------------------------ | ------------------------------------------ |
| `npm run dev`                              | Start the dev server                       |
| `npm run build` / `npm run start`          | Production build / serve                   |
| `npm run lint` / `npm run typecheck`       | ESLint / `tsc --noEmit`                    |
| `npm run test`                             | Unit tests (Vitest)                        |
| `npm run test:integration`                 | Integration tests — needs a live DB        |
| `npm run test:e2e`                         | Playwright e2e — run `npm run build` first |
| `npm run db:up` / `npm run db:down`        | Start / stop the local Docker Postgres     |
| `npm run db:migrate` / `npm run db:deploy` | Prisma migrate (dev / deploy)              |

## Project structure

```
src/
  app/        Next.js routes (delivery layer only)
  core/       the agent engine — framework-agnostic (built in Phases 4–7)
  server/     server-only concerns (db, auth, crypto, ratelimit)
  ui/         hand-rolled Tailwind components
  lib/        shared utils, env
  config/     constants
agents/       agent definitions — the portable spec
prisma/       schema + migrations (incl. custom pgvector migration)
tests/        integration + e2e
docker/       local Postgres + pgvector
```

The dependency rule points inward: **`core/` never imports from `app/`** or Next.js.
