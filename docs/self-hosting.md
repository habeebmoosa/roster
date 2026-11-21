# Self-hosting Roster

Roster runs anywhere you can run Node 22+ and a PostgreSQL database with the
`pgvector` extension. There is no hosted dependency: sign-in, LLM providers,
rate limiting, error tracking and the database are all configurable.

## Option 1 — Docker Compose (fastest)

```bash
cp .env.example .env
# Set AUTH_SECRET (openssl rand -base64 33), ENCRYPTION_KEY (openssl rand -base64 32)
# and one sign-in provider (Google or GitHub — see .env.example).
docker compose up --build
```

Open http://localhost:3005. The container applies migrations and seeds the five
employees plus the connector directory on every start (both are idempotent).
Data lives in the `roster-app-pgdata` volume.

> Set `APP_URL` (and `AUTH_URL` behind a proxy) to the public URL, and register
> `<APP_URL>/api/auth/callback/google` (or `/github`) with your OAuth provider.

## Option 2 — Node + any Postgres

1. Provision Postgres with `CREATE EXTENSION vector` available.
2. Set `DATABASE_URL` / `DIRECT_URL`, then `npx prisma migrate deploy` and
   `npx prisma db seed`.
3. `npm ci && npm run build && npm run start`.

## Knowledge bases (embeddings)

The employees' knowledge and playbooks are chunked, embedded and stored with
`npm run ingest -- --agent <id>`. This needs a user with a saved
embedding-capable provider key (OpenAI or Google). Without ingestion, employees
still work — they just answer without retrieval grounding.

## Model catalog sync

`/api/cron/sync-model-catalog` refreshes the model list. On Vercel it runs via
Vercel Cron (`vercel.json`); elsewhere schedule `npm run models:sync` (or call
the route with `Authorization: Bearer $CRON_SECRET`).

---

## Deploying on Vercel + Supabase

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
- A sign-in provider — `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` and/or
  `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`. Add the production callback URL
  (`https://<your-domain>/api/auth/callback/google` or `/github`) in the
  provider's console
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
