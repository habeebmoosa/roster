# Roster

Hireable, specialized **AI employees** that perform like experts on _any_ LLM you bring —
because the expertise is engineered into the agent, not the model.

See [`Product-Overview.md`](./Product-Overview.md) for the pitch, [`MVP-Plan.md`](./MVP-Plan.md)
for the full build plan, and [`CLAUDE.md`](./CLAUDE.md) for a quick orientation.

> **Status: Phase 1 — Foundation.** Next.js + TypeScript, a configurable Postgres with
> pgvector via Prisma, the folder structure, and the quality gates (lint, typecheck, unit,
> integration, e2e, CI) are in place.

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

# 2. Configure — copy the example and adjust if needed
cp .env.example .env

# 3. Start the local database (Postgres 16 + pgvector)
npm run db:up

# 4. Apply migrations (enables pgvector + creates tables)
npm run db:migrate

# 5. Run the app
npm run dev
```

Then open http://localhost:3000 and check http://localhost:3000/api/health — it should report
`{ "status": "ok", "checks": { "db": true, "pgvector": true } }`.

## Using a different Postgres

The database is fully configurable — point `DATABASE_URL` (and `DIRECT_URL` for migrations) at
any Postgres (self-hosted on EC2, Supabase, Neon, RDS, …). The only requirement is that the
`pgvector` extension can be installed. No code changes needed.

> The local Docker Postgres is published on host port **5433** (not 5432) so it
> won't clash with any Postgres you already run locally.

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
