# Roster — MVP Plan

> **Product in one line:** Hireable, specialized AI employees (Customer Support, Content Writer, Research Analyst, Financial Analyst, Team Organizer) that perform like experts on _any_ LLM the user brings — including cheap models like Gemini Flash or open-weight models.

> **The bet:** The model is a commodity. The _scaffolding around the model_ — curated context, expert playbooks, structured workflows, retrieval discipline — is the product. Everything in this plan prioritizes the agent engine, because that is the only defensible moat.

> **How we build it:** Strictly vertical and incremental. We stand up a working foundation end-to-end first (auth + configurable DB), then prove BYOK works end-to-end, then build the agent engine one capability at a time — each capability measured by the eval harness as it lands. Every phase ships something testable. UI is deliberately minimal early and improves phase by phase.

---

## 1. Guiding principles

Non-negotiable. They shape every decision below.

1. **Environment over model.** Open-weight models reach ~80% of frontier performance when wrapped in a validated, structured environment. We invest in the environment, not in picking the "best" model.
2. **Less context, not more.** Bloated context degrades every model ("lost in the middle" / "context rot"). Tight, re-ranked, hard-capped context is what lets a weak model punch above its weight.
3. **Encode _how_ an expert thinks, not just _what_ they know.** Procedural playbooks (decision trees, step sequences) are the differentiator, not raw knowledge dumps.
4. **Prove it on every commit.** "Works great on any model" is only true if an eval harness demonstrates it across model tiers on every change. The eval harness _is_ the moat, made measurable — so we build it early (Phase 5), not last.
5. **Build vertically, ship every phase.** One capability, working end-to-end and tested, before the next. No half-built horizontal layers.
6. **Everything is configurable, nothing is locked.** The database, the LLM providers, the model choice, the tools — all user-configurable. No vendor lock-in, including our own.

---

## 2. Tech stack

Deliberately lean. No heavy component libraries; no managed services we can't swap out.

| Layer            | Choice                                                                                   | Why                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework        | **Next.js 15 (App Router) + TypeScript (strict)**                                        | Full-stack, one language, first-class streaming                                                                                                  |
| AI framework     | **Vercel AI SDK v5**                                                                     | TS-native, unified 15+ provider abstraction, `createOpenAICompatible` + provider registry make configurable BYOK nearly free                     |
| Database         | **PostgreSQL + `pgvector`** — **provider-agnostic**                                      | Relational + vector store in one. Runs on _any_ Postgres: local Docker, self-hosted EC2, Supabase, Neon, RDS — chosen entirely by `DATABASE_URL` |
| ORM & migrations | **Prisma**                                                                               | Type-safe client + first-class migration workflow. pgvector via custom migration + `Unsupported("vector")` + raw/TypedSQL                        |
| Auth             | **Auth.js (NextAuth v5) + Google OAuth**                                                 | Stable, standard, Prisma adapter                                                                                                                 |
| Styling          | **Tailwind CSS only** (no component library)                                             | Keep the bundle light; hand-roll a tiny internal UI kit. **No shadcn/ui**                                                                        |
| Rate limiting    | Upstash Redis (or self-hosted Redis)                                                     | Configurable, works on serverless                                                                                                                |
| Validation       | **Zod**                                                                                  | One schema tool for env, API input, and agent definitions                                                                                        |
| Testing          | **Vitest** (unit/integration) + **Playwright** (e2e) + custom **eval harness** (quality) | Three tiers of confidence                                                                                                                        |
| Error tracking   | Sentry (free tier)                                                                       |                                                                                                                                                  |
| Deployment       | Vercel (or any Node host / Docker)                                                       | Not locked to Vercel; standard Next.js build                                                                                                     |

> **Key stack changes from the original draft:** Prisma replaces raw SQL for migrations; the database is explicitly provider-agnostic and configurable; shadcn/ui is dropped in favor of a hand-rolled Tailwind kit to keep things light.

---

## 3. Engineering standards & conventions

Applied from Phase 1, enforced in CI.

- **TypeScript strict everywhere.** No `any`; `unknown` + narrowing at boundaries. `noUncheckedIndexedAccess` on.
- **Validate all external input with Zod** — environment variables (validated once at boot and exported typed), REST API bodies, and agent definition files. Nothing untyped crosses a boundary.
- **Layered architecture, dependency rule points inward.** `core/` (the domain: agent engine, retrieval, memory, workflow, eval) is framework-agnostic and must never import from `app/` or Next.js. `server/` holds server-only concerns (DB, auth, crypto). `app/` is the delivery layer only.
- **Repository pattern for data access.** Prisma client lives behind repositories in `server/db/`; core logic depends on interfaces, not Prisma directly. Keeps the domain testable and the DB swappable.
- **Typed, specific errors.** Especially BYOK failure modes (invalid key, rate limit, insufficient quota) — dedicated error types surfaced cleanly to the UI/API, never leaked stack traces.
- **Secrets discipline.** Provider keys encrypted at rest (AES-256-GCM), never logged, decrypted only at request time inside the route that needs them. A lint rule / review checklist guards against logging secrets.
- **Tooling:** ESLint + Prettier, conventional commits, CI on every PR (lint → typecheck → unit/integration → e2e smoke). From Phase 5 onward, CI also runs the eval gate.
- **Testing discipline:** every phase defines its own "Definition of Done" and "How we test it" (below). No phase is complete until its tests are green.
- **Feature flags / config over hardcoding.** Agents, providers, tools, and DB are all data/config, never hardcoded branches.

---

## 4. Repository & folder structure

Best-in-class, feature-and-layer oriented. Established in Phase 1 and kept clean throughout.

```
roster/
├─ src/
│  ├─ app/                         # Next.js App Router — delivery layer ONLY
│  │  ├─ (marketing)/              # public landing pages
│  │  ├─ (app)/                    # authenticated application
│  │  │  ├─ dashboard/
│  │  │  ├─ employees/             # browse / "hire" employees
│  │  │  ├─ chat/[agentId]/        # streaming chat surface
│  │  │  └─ settings/
│  │  │     ├─ providers/          # BYOK: manage LLM keys, baseURLs, configs
│  │  │     └─ api-keys/           # platform API keys
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/    # Auth.js handler
│  │  │  ├─ chat/                  # internal chat streaming endpoint
│  │  │  └─ v1/                    # public REST API (versioned)
│  │  │     └─ agents/[id]/chat/
│  │  ├─ layout.tsx
│  │  └─ globals.css
│  │
│  ├─ core/                        # THE PRODUCT — framework-agnostic domain
│  │  ├─ agent/                    # runAgent(), agent-definition loader/validator
│  │  ├─ providers/                # AI SDK registry, provider config resolution
│  │  ├─ memory/                   # semantic | procedural | episodic | working
│  │  ├─ retrieval/                # hybrid search, re-ranker, context assembler + cap
│  │  ├─ workflow/                 # decompose → execute → validate → rollback
│  │  ├─ tools/                    # built-in tools (file conversion, basic utilities) — local, no network
│  │  ├─ mcp/                      # MCP client: protocol (tools/call, resources/read), transport, OAuth
│  │  └─ eval/                     # eval harness (runner, scorers, tiers)
│  │
│  ├─ server/                      # server-only concerns
│  │  ├─ db/                       # prisma client + repositories
│  │  ├─ auth/                     # auth.ts (Auth.js config), session helpers
│  │  ├─ crypto/                   # AES-256-GCM vault
│  │  └─ ratelimit/                # Upstash/Redis limiter
│  │
│  ├─ ui/                          # DESIGN SYSTEM — presentational Tailwind primitives (+ theme)
│  ├─ components/                  # shared app chrome (layout: app-shell, sidebar, topbar)
│  ├─ features/                    # feature modules (dashboard, workers, chat, connectors, settings, hire)
│  ├─ hooks/                       # shared React hooks
│  ├─ lib/                         # shared utils, env (zod), shared types
│  └─ config/                      # constants, model-tier definitions
│
├─ agents/                         # AGENT DEFINITIONS — the portable open spec
│  ├─ customer-support/
│  │  ├─ agent.yaml                # identity, voice, expertise, abilities, budget
│  │  ├─ playbooks/                # procedural markdown decision trees
│  │  └─ knowledge/                # source docs to be chunked + embedded
│  └─ ...(content-writer, research-analyst, financial-analyst, team-organizer)
│
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/                  # includes custom pgvector extension migration
│
├─ evals/                         # labeled eval sets + fixtures per employee
├─ tests/                         # Playwright e2e + cross-cutting integration
├─ docker/                        # local postgres+pgvector compose for dev
└─ (config: eslint, prettier, tsconfig, vitest, playwright, CI)
```

> **Why `agents/` and `core/` are separate from `app/`:** the agent definitions are our future open/marketplace spec, and the engine is the moat. Keeping both out of the Next.js layer means they stay portable, independently testable, and reusable from the REST API, the eval harness, and (later) automation runners — without dragging in web framework code.

> **Frontend layering** (built out in Phase 6, §6.1): `ui/` = pure design-system primitives (reused everywhere, kills repetition), `components/` = shared app chrome, `features/*` = self-contained domain modules (components + hooks + fixtures + types), and `app/` route files stay thin — they just compose feature modules. Enterprise hybrid of feature-based + colocation.

---

## 5. Configurable database strategy

The database is chosen entirely by configuration — no code changes to switch providers.

- **Single source of truth:** `DATABASE_URL`. Point it at local Docker, a self-hosted Postgres on EC2, Supabase, Neon, RDS — anything speaking Postgres. A `DIRECT_URL` is also supported for migrations when the primary URL is a pooled/serverless connection (Neon, Supabase pooler, PgBouncer).
- **Only requirement:** `pgvector` must be installable on the target (`CREATE EXTENSION vector`). All the managed options (Neon, Supabase, RDS) support it; for self-hosted we document the `pgvector/pgvector` Docker image and the extension install.
- **pgvector + Prisma approach** (native vector type isn't in Prisma yet, confirmed mid-2026):
  1. Enable the extension with a **custom migration**: `prisma migrate dev --create-only`, then add `CREATE EXTENSION IF NOT EXISTS vector;` and the `vector(N)` column + index (HNSW/IVFFlat) to the generated SQL.
  2. Represent the column in `schema.prisma` as `Unsupported("vector")` so Prisma tracks it without breaking `generate`.
  3. Read/write vectors and run similarity (`<=>` cosine distance) via `$queryRaw` / TypedSQL, wrapped in a repository so the rest of the app stays clean.
- **Local dev:** `docker/` ships a one-command `docker compose up` Postgres 16 + pgvector, so a fresh clone runs with zero external accounts.
- **Connection pooling:** documented for serverless targets; the repository layer is agnostic to which URL style is in use.

---

## 6. Data model (Prisma schema)

Managed via Prisma migrations. Vector columns via the custom-migration approach above.

| Model                                       | Key fields                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`                                      | from Auth.js (id, email, name, image)                                                                                                                                                                                                                                                                                            |
| `Account` / `Session` / `VerificationToken` | Auth.js Prisma adapter tables                                                                                                                                                                                                                                                                                                    |
| `ProviderKey`                               | userId, provider, **encryptedKey (AES-256-GCM)**, baseUrl, config (JSON — headers, org, region, api-version, etc.), createdAt                                                                                                                                                                                                    |
| `Agent`                                     | id, name, role, definition (persona/voice/expertise), defaultTools                                                                                                                                                                                                                                                               |
| `AgentKnowledge`                            | agentId, chunk, embedding (`vector`), source, **permissions**                                                                                                                                                                                                                                                                    |
| `Playbook`                                  | agentId, name, content (markdown decision tree)                                                                                                                                                                                                                                                                                  |
| `Conversation`                              | userId, agentId, title (derived from the first user message), createdAt, updatedAt                                                                                                                                                                                                                                               |
| `Message`                                   | conversationId, role (user/assistant), content, stepEvents (JSON — the assistant turn's Phase 8 `WorkflowStepEvent[]`, so a reloaded conversation can re-render its steps), createdAt                                                                                                                                            |
| `McpServer`                                 | a directory entry or a user-added custom server: name, slug, description, iconUrl, developer, connectorUrl, authType (oauth_dcr/static_headers/none), categories, cached capability list (tools + resources), trust tier (verified/community/custom), optional pre-registered OAuth client id/secret, docs/support/privacy links |
| `McpConnection`                             | userId, mcpServerId, **encrypted OAuth tokens or static header value (AES-256-GCM)**, expiresAt, status                                                                                                                                                                                                                          |
| `AgentMcpServer`                            | which connected MCP servers are enabled for which agent                                                                                                                                                                                                                                                                          |
| `ApiKey`                                    | userId, label, keyPrefix (shown in UI), **hashedKey (SHA-256 — compared, never decrypted)**, lastUsedAt, revokedAt                                                                                                                                                                                                               |
| `EvalRun`                                   | agentId, modelTier, successRate, tokens, retrievalPrecision/Recall, latency, timestamp                                                                                                                                                                                                                                           |

> **BYOK security:** encrypt with AES-256-GCM using a server-side secret before storing. Never store raw, never log. Decrypt only inside the request that uses it. Validate keys with a cheap ~1-token ping on save. The `config` JSON + `baseUrl` make each provider entry fully self-describing (an OpenAI-compatible endpoint, an Azure deployment, a Bedrock region, a local Ollama URL — all just data).

> **Governance:** `AgentKnowledge.permissions` scopes what each agent may recall. What enters the context window matters more than the retrieval mechanism — permission-scoping is built in from day one (Phase 7).

---

## 7. The Agent Engine (conceptual — implemented across Phases 4–5, 7–9)

This is the product. The phases below build it piece by piece; this section is the target design.

- **Agent definition (portable spec).** Each employee is a structured YAML file, not hardcoded — the future marketplace format.
  ```yaml
  id: customer-support
  name: "Ada — Customer Support"
  role: "Customer Support Specialist"
  identity: "Calm, precise, empathetic. Resolves, never deflects."
  voice: "Warm but concise. Mirrors customer tone. Never robotic."
  expertise: [de-escalation, policy interpretation, troubleshooting]
  abilities: [kb_lookup, draft_reply, escalate_ticket]
  memory:
    semantic: ["kb://support-docs"]
    procedural: ["playbook://refund-flow", "playbook://angry-customer"]
  context_budget_tokens: 8000 # hard cap
  ```
- **Four-layer memory** (retrieved separately, assembled per query): **semantic** (domain knowledge, pgvector) · **procedural** (expert playbooks) · **episodic** (this user's history/preferences) · **working** (current session). _The procedural layer is where we win._
- **Retrieval pipeline:** `query → hybrid retrieval (vector + BM25/full-text) → 30–50 candidates → re-ranker → keep top 3–5 → assemble → HARD CAP at context_budget_tokens`. Never dump raw chunks. The re-ranker is the highest-leverage component; the hard cap matters most for weak models.
- **Structured workflow:** `decompose → execute → validate → (retry/rollback) → compress intermediate results`. Cuts errors 60–80% vs one-shot; closes the gap on weak models.
- **`runAgent()`** — the single entry point: loads definition → resolves provider/model via the registry → runs retrieval → attaches enabled tools → executes the workflow → returns a stream. Chat, REST API, and the eval harness all call this.
- **Eval harness** — labeled sets per employee, run across three model tiers (frontier / mid / cheap). A change ships only if success rate holds or improves on _all three_.

---

## 8. The phased build plan

**~13 phases.** Foundation (1–2) → BYOK/AI proven end-to-end (3) → agent-engine skeleton + eval harness (4–5) → full product frontend from the design (6) → agent engine built and measured capability-by-capability (7–8) → the five employees + tools (9–10) → chat real-time & access surfaces (11–12) → ship (13). Each phase is independently testable and leaves `main` in a working state.

> **Progress:** ✅ Phases 1–11 complete · ⬜ Phase 12 (REST API & platform keys) is next · ⬜ Phase 13 remaining.

---

### Phase 1 — Project foundation & tooling ✅ COMPLETE

**Goal:** A running, strict, well-structured Next.js app connected to a configurable Postgres, with the folder structure and quality gates in place.

**Deliverables**

- Next.js 15 (App Router) + TypeScript strict; the full folder structure from §4 scaffolded.
- Tailwind configured; a tiny hand-rolled UI kit started in `src/ui/` (button, input, card, layout primitives). No component library.
- Zod-validated, typed environment module (`lib/env`) — app refuses to boot on bad config.
- Prisma initialized; `DATABASE_URL` / `DIRECT_URL` wired; **custom migration enabling `pgvector`**.
- `docker/` compose for local Postgres 16 + pgvector (one-command dev DB).
- Tooling: ESLint, Prettier, Vitest, Playwright, CI pipeline (lint → typecheck → test).
- A `/health` route that verifies DB connectivity and pgvector availability.

**Key decisions**

- Establish the inward dependency rule (`core` never imports `app`) and the repository pattern now, so later phases inherit clean boundaries.
- pgvector approach fixed here (custom migration + `Unsupported("vector")`).

**Definition of Done**

- `docker compose up` + `prisma migrate dev` yields a working DB with the vector extension.
- App boots, `/health` returns green (DB + pgvector), CI passes on a clean clone.

**How we test it**

- Unit: env validation rejects bad config.
- Integration: a repository test writes and reads a row, and a raw `<=>` query runs against a seeded `vector` column.
- CI green end-to-end on a fresh checkout.

---

### Phase 2 — Auth & core app shell (foundation, end-to-end) ✅ COMPLETE

**Goal:** A real user can sign in with Google and land in an authenticated app. Foundation is now complete end-to-end.

**Deliverables**

- Auth.js v5 + Google OAuth + `@auth/prisma-adapter`; root `auth.ts`; `AUTH_`-prefixed env.
- Auth.js Prisma models migrated (`User`/`Account`/`Session`/`VerificationToken`).
- Session handling, `middleware.ts` route protection, sign-in/sign-out flows.
- Authenticated app shell: nav, dashboard placeholder, settings scaffold — styled with the light Tailwind kit.
- Base data model migrations for the core tables that later phases fill in.

**Key decisions**

- Session strategy (database sessions via adapter) fixed here.
- App-shell layout and the `(app)` route group established as the home for all authed features.

**Definition of Done**

- Sign in → protected dashboard → sign out works against a real Google OAuth app.
- Unauthenticated access to `(app)` routes redirects to sign-in.

**How we test it**

- E2E (Playwright): full Google sign-in flow (test account) → dashboard → sign out.
- Integration: middleware blocks unauthed access; session persists across requests.

---

### Phase 3 — LLM provider layer & BYOK vault (AI proven end-to-end) ✅ COMPLETE

**Goal:** A user can add their own provider credentials (key + baseURL + config), and we can stream a real completion through the Vercel AI SDK using them. BYOK is proven end-to-end before any agent complexity.

**Deliverables**

- Vercel AI SDK v5 + provider packages (OpenAI, Anthropic, Google, Mistral, Groq, DeepSeek, Together, Fireworks, Cohere, xAI, Perplexity, Azure, Bedrock — as available).
- **Provider registry** in `core/providers/`: native providers + `createOpenAICompatible` for anything speaking the OpenAI API (custom `baseURL`, `headers`, extra config). Resolves `(provider, model, userConfig)` → an AI SDK model instance.
- `ProviderKey` model + **AES-256-GCM vault** (`server/crypto/`): encrypt on save, decrypt only at request time, never log.
- **Provider settings UI** (`settings/providers/`): add/edit/delete a provider config — API key, optional baseURL, and provider-specific fields (Azure deployment/api-version, Bedrock region, org id, custom headers, model list).
- **Validation ping** on save (~1 token) with clean, specific error surfacing.
- A minimal **playground**: pick a configured provider + model → send a prompt → watch it stream back.
- Typed BYOK error taxonomy (invalid key / rate limited / insufficient quota / bad baseURL).

**Key decisions**

- Provider config is _pure data_ (baseURL + JSON config) so new providers rarely need code.
- The registry is the single choke point for model resolution — chat, API, and eval all go through it.

**Definition of Done**

- Add a real key for ≥2 providers (one native, one OpenAI-compatible via baseURL) → validation passes → streaming completion works in the playground.
- Every BYOK failure mode renders a specific, friendly message.

**How we test it**

- Unit: encrypt→decrypt round-trip; registry resolves each provider shape correctly.
- Integration: validation ping against a mock/live endpoint; error taxonomy maps correctly.
- E2E: add key → validate → stream a completion in the playground.

---

### Phase 4 — Agent definition spec & `runAgent()` skeleton ✅ COMPLETE

**Goal:** The core entry point exists. We can chat with a persona-driven agent (Customer Support) defined by a file — no retrieval or workflow yet.

**Deliverables**

- Agent definition **schema + loader/validator** (Zod) in `core/agent/`; definitions live in `agents/` as YAML (the portable spec).
- First agent authored as a file: `agents/customer-support/agent.yaml` (identity, voice, expertise, context budget).
- **`runAgent()` v1**: load definition → build system prompt from identity/voice/expertise → resolve provider/model via the registry → stream. Working memory (session messages) only.
- `Agent` table + seeding from definition files.
- Playground upgraded to run _through an agent_ (persona applied) on any configured model.

**Key decisions**

- `runAgent()` signature and streaming contract locked here — everything downstream flows through it.
- Definitions-as-files from day one keeps the schema clean and marketplace-ready.

**Definition of Done**

- Chatting with Customer Support shows consistent persona/voice on both a cheap and a frontier model, via the same `runAgent()` path.

**How we test it**

- Unit: loader rejects malformed definitions; system-prompt assembly is deterministic.
- Integration: `runAgent()` streams correctly across two provider tiers.
- E2E: persona chat in the playground.

---

### Phase 5 — Eval harness (built early, on purpose) ✅ COMPLETE

**Goal:** The moat, made measurable — _before_ we build retrieval and workflow, so every subsequent capability is validated across model tiers as it lands.

**Deliverables**

- Labeled eval set for Customer Support in `evals/` (realistic tasks + expected outcomes/graders).
- **Eval runner** in `core/eval/`: runs a set through `runAgent()` across **three tiers** (frontier / mid / cheap), using configured providers.
- Scorers: task success rate, tokens per successful task, latency, cost. (Retrieval precision/recall added in Phase 7.)
- `EvalRun` persistence + a simple results view (compare tiers over time).
- **CI eval gate**: a change is accepted only if success rate holds or improves across all three tiers.

**Key decisions**

- Eval-as-gate established now; it governs Phases 6–8 as they're built.
- Baseline captured for the skeleton agent so later gains are measurable.

**Definition of Done**

- One command runs the Customer Support eval across three tiers and writes `EvalRun` rows; the CI gate blocks a deliberate regression.

**How we test it**

- Unit: scorers produce correct metrics on fixtures.
- Integration: full run across three tiers completes and persists.
- Meta-test: an intentionally worse prompt fails the gate (proves the gate bites).

---

### Phase 6 — Frontend: design system & application UI ✅ COMPLETE

**Goal:** Build the full, design-faithful product UI from the **RosterAI platform design** — a component-based Tailwind frontend covering every screen — wired to the backend that already exists (auth, providers/BYOK, agent chat, evals) and backed by clearly-marked typed fixtures for features whose backend lands later (usage analytics, connectors, abilities, API keys, billing, knowledge sources). Every subsequent backend phase then "lights up" its screen by swapping a fixture for a real repository/API, with no UI rework.

**Why here:** The design is ready, and a real UX de-risks everything downstream — retrieval, workflow, tools, and the employees are all easier to build and demo against real screens. It also front-loads the "outstanding, enterprise-grade" surface the product is judged on. Crucially, it is **additive**: the engine (Phases 7–9) is unaffected because the UI talks to it only through the existing `runAgent()`/service boundaries.

**Design source of truth:** imported from the Claude Design project _RosterAI platform design_ (`RosterAI.dc.html`). Fonts **Public Sans** (UI) + **IBM Plex Mono** (code/tags). Full **light/dark** token system in OKLCH: `bg` / `bg-elevated` / `bg-subtle`, `border`, `text` / `text-muted` / `text-faint`, `accent` (violet, ~280 hue) + `accent-soft` / `accent-contrast`, `success` / `warning` / `danger` (each with `-soft`), `shadow-sm` / `shadow-md`. These map 1:1 into the Tailwind v4 `@theme`.

#### 6.1 Frontend architecture (enterprise, component-based)

Hybrid **feature-based + colocation** structure (the current Next.js consensus): a shared design system, shared app chrome, thin route files that compose self-contained feature modules. No repetition — screens are assembled from primitives + feature components.

```
src/
  app/                              # routes ONLY — thin; compose features
    (marketing)/                    # landing + signin (exist)
    (app)/                          # authenticated shell
      layout.tsx                    # <AppShell> (sidebar + topbar + theme)
      overview/page.tsx             # Dashboard
      workers/page.tsx              # Employee list
      workers/[employeeId]/page.tsx # Employee detail (stats, about, API access)
      chat/page.tsx                 # Employee chat
      connectors/page.tsx           # MCP connector directory + custom connector management
      settings/page.tsx             # Tabbed settings
      hire/page.tsx                 # "Hire a new employee" wizard
  ui/                               # DESIGN SYSTEM — presentational primitives, no domain logic
    button · input · textarea · select · card · badge · avatar (gradient)
    switch · tabs · table · modal · drawer · dropdown-menu · tooltip
    stat-tile · steps (wizard stepper) · empty-state · skeleton · toast
    theme/  { theme-provider, theme-toggle, tokens in globals.css @theme }
  components/                       # shared APP chrome (composite, cross-feature)
    layout/  { app-shell, sidebar, topbar, workspace-switcher, profile-menu }
  features/                         # FEATURE MODULES — domain UI, colocated
    dashboard/  { components/, hooks/, fixtures.ts, types.ts }
    workers/    { components/ (employee-card, employee-table, filters, detail/*), … }
    chat/       { components/ (thread, message, composer, history-drawer, employee-switcher), hooks/use-chat-stream.ts }
    connectors/ { components/, fixtures.ts, types.ts }
    settings/   { components/ (workspace, profile, providers, api-keys, billing tabs) }
    hire/       { components/ (step-role, step-basics, step-knowledge, step-abilities, step-model, step-review), hooks/use-hire-wizard.ts, types.ts }
  hooks/                            # shared hooks (use-theme, use-media-query, use-toast)
  lib/                              # shared utils (cn, formatters, env)
```

Rules: `ui/` is pure/presentational and reused everywhere (kills repetition); `features/*` own their domain components + fixtures + types; route files stay thin (fetch on the server, render a feature component); `core/` and `server/` are untouched by the UI.

#### 6.2 Design system (do this first)

- **Tokens & theme:** port the exact OKLCH light/dark tokens into `globals.css` `@theme`; wire fonts via `next/font` (self-hosted, no runtime network). A `ThemeProvider` toggles `data-theme` on `<html>` and persists the choice (cookie/localStorage; SSR-safe, no flash).
- **Primitives:** build the `ui/` kit listed above with variants + sizes + all states (hover/focus/disabled/loading), fully keyboard-accessible. This is the anti-repetition layer — every screen composes these.

#### 6.3 App chrome

Collapsible **Sidebar** (grouped nav: _Operate_ → Overview, Roster, Chat; _Configure_ → Connectors, Settings) with workspace switcher, profile menu (docs, upgrade, theme toggle, sign out), and the **Hire employee** CTA. **Topbar** per page. Responsive (sidebar collapses to icons / drawer on mobile).

#### 6.4 Screens (all from the design)

- **Overview / Dashboard** — greeting; stat tiles (active employees, conversations · 30d, spend this month, eval success rate); "Your workers" preview; "Usage & cost" per-employee breakdown; recent activity; quick actions (hire / add connector / open settings). _Wire now:_ eval success from `EvalRun`; agents from DB. _Fixtures:_ spend/convos/tokens analytics.
- **Workers** (employee list, `/workers`) — employee table (tag/avatar, name, role, status, model, convos, spend) with filter/display controls + pagination; **Hire employee** CTA. _Wire now:_ agents list. _Fixtures:_ per-employee metrics.
- **Employee detail** (`/workers/[id]`) — header (avatar, status, role, Pause/Edit); stat row (conversations, spend, tokens, uptime); tabs; **About** (identity/voice from the definition); recent activity; **model** (provider/tier + "Change model"); **API access** (auth toggle: API key / none, endpoint `POST /v1/agents/{id}/chat`, copyable code snippet in multiple languages). _Wire now:_ definition fields. _Fixtures:_ metrics, activity.
- **Chat** — employee switcher, **New chat**, **History** drawer, message thread (user/assistant bubbles, streaming), composer, model indicator + switcher. _Wire now:_ streams through the existing agent-chat endpoint (`runAgent()`). _Fixtures:_ saved history list (real persistence arrives Phase 11).
- **Connectors** — a directory of MCP servers (connector cards: icon, name, one-line description, trust badge); clicking a card opens a detail dialog (longer description, example prompts, developer, tool list + count, categories, an Author/Capabilities/Connector-URL details panel, Documentation/Support/Privacy-Policy links, a Connect button) — modeled directly on Claude's own connector detail view. Plus an "Add custom connector" flow for pasting an arbitrary MCP server URL. _Real since Phase 10:_ directory data, OAuth + static-header connect, custom connectors, per-agent enable/disable.
- **Settings** — tabs: **Workspace** (name, URL, timezone, appearance/theme, delete workspace); **Profile** (avatar, name, email, 2FA, change/delete); **Providers** (reuse the real Phase 3 BYOK UI, restyled to the design); **API keys** (create/revoke — fixtures now, real in Phase 12); **Billing** (plan, payment, invoices — fixtures now).
- **Hire a new employee** (`/hire`) — 6-step wizard with a stepper: (1) role, (2) basic details, (3) knowledge base (upload / connect source), (4) abilities (tool toggles), (5) provider & model (BYOK), (6) review & create + live preview. Back / Continue / Save & exit. _Wire now:_ provider/model from the real catalog + saved keys; create writes an `Agent` (definition). _Fixtures:_ knowledge upload. Abilities catalog is real since Phase 10 (built-in tools genuinely execute; MCP servers are enabled separately via Connectors).

#### 6.5 Data strategy

Every screen reads through a typed module boundary. Where the backend exists (auth/session, providers CRUD, agent chat, agents list, eval runs) it calls the real thing; everything else imports a **typed fixture** from `features/*/fixtures.ts` that matches the eventual API shape. Fixtures are the seam later phases replace — swap the import, keep the component. All fixtures are clearly marked so nothing masquerades as real data.

**Definition of Done**

- Every screen from the design is implemented, component-based, pixel-close in both light and dark themes, and responsive.
- Real data flows where the backend exists (sign-in, providers, agent chat, agents, eval success); fixtures elsewhere, cleanly swappable.
- The `ui/` design system is the single source of visual truth — no ad-hoc styling in features.

**How we test it**

- Unit: `ui` primitives (variants/states) + pure formatters/hooks.
- E2E (Playwright): public routes render; theme toggle persists; the hire wizard navigates all 6 steps; nav routes resolve. (Authenticated screens verified manually + via component tests, consistent with earlier phases.)
- Visual: render each screen light/dark and compare against the design reference.

> **How we match the design exactly:** (1) port the design's OKLCH tokens + fonts verbatim into the Tailwind theme so color/type are identical; (2) keep `RosterAI.dc.html` and its reference screenshots as the visual source of truth (imported via the Claude Design MCP); (3) rebuild each screen from `ui/` primitives, matching spacing, radii, shadows, and states; (4) screenshot our build per screen (light/dark) and diff against the reference, iterating until they match. Optionally keep the `ui/` library in sync with the Design project via the `/design-sync` MCP flow.

---

### Phase 7 — Memory & retrieval pipeline ✅ COMPLETE

**Goal:** Grounded answers from curated context. Semantic + procedural + episodic memory, hybrid retrieval, re-ranking, hard cap, permission-scoping — all measured by the Phase 5 harness.

**Deliverables**

- **Ingestion pipeline**: chunk `agents/*/knowledge/` docs → embed (via a configured provider) → store in `AgentKnowledge` (pgvector).
- **Procedural memory**: load `playbooks/` markdown; **episodic memory**: per-user history/preferences store.
- **Hybrid retrieval** (`core/retrieval/`): pgvector similarity + Postgres full-text (BM25-style) → 30–50 candidates.
- **Re-ranker**: LLM-prompt-based scoring (the caller's own configured chat model — no separate model/runtime dependency, works on any BYOK tier) → keep top 3–5.
- **Context assembler** with a **hard token cap** at the agent's `context_budget_tokens`; never dumps raw chunks.
- **Permission-scoping** enforced at retrieval (`AgentKnowledge.permissions`).
- Retrieval wired into `runAgent()`; retrieval precision/recall added to the eval scorers.

**Key decisions**

- Re-ranker is treated as the highest-leverage component and gets disproportionate tuning attention.
- Hard cap is enforced centrally in the assembler, not left to callers.

**Definition of Done**

- Seed the KB → ask questions → answers are grounded in the correct top-k chunks, capped, and permission-filtered. Eval shows the **cheap tier moving toward frontier** on grounded tasks.

**How we test it**

- Unit: chunker, cap enforcement, permission filter.
- Integration: hybrid retrieval + re-rank returns expected top-k on a labeled fixture; precision/recall computed.
- Eval: Customer Support success rate improves across tiers vs the Phase 5 baseline.

---

### Phase 8 — Structured workflow engine ✅ COMPLETE

**Goal:** Turn one big prompt into a disciplined loop — decompose → execute → validate → rollback — closing the gap on weaker models, without paying full workflow overhead on every trivial turn. Cost and latency are first-class constraints on this phase, not an afterthought: every added call has to earn its place against a simpler alternative (Anthropic, OpenAI, and Google all name "run the heavy pipeline on everything" as the anti-pattern, not the safe default).

**Deliverables**

- Workflow engine in `core/workflow/`: decompose a task into verifiable sub-steps; per step assemble minimal context (reusing Phase 7's retrieval, called per-step with that step's own query, not one blanket retrieval for the whole task) → call the model → **validate** output.
- **Single-step bypass**: when the decomposer returns exactly one step, skip the validate/compress machinery entirely and stream that step directly to the user — the same shape as today's Phase 7 path. This is a zero-extra-call check on output the decomposer already produces, not a second classifier call, so it doesn't reintroduce the fragile-heuristic problem uniform decomposition was trying to avoid. Trivial chat turns keep paying for one decomposition call, not for a validator and compressor they don't need.
- **Mechanical validators first.** Validation hooks are pluggable per step type, in this priority order: schema/shape checks and tool-result checks are code, not LLM calls — free and deterministic. Groundedness checks (do claims trace back to retrieved context) stay LLM-based, since that's a genuinely semantic comparison — but only run where a step actually used retrieval. A step's validator is never "ask the same model if its own answer looks good" — same-model self-critique is the one form of self-correction the literature shows doesn't reliably help, especially on weaker models.
- **Mechanical compression first.** Compression between steps is truncation/structured extraction (code) whenever a step's output already fits the next step's context budget. Only step outputs that genuinely exceed the budget get an LLM summarization call.
- **Retry/rollback cap:** max 1 retry per step (same step, failure fed back into the prompt), max 1 rollback per plan. No unbounded retry loops — a step that fails twice surfaces as a workflow failure, not a cost multiplier.
- **Cost instrumentation** added to the eval harness: `EvalRun` gains a `costUsd` field computed from usage × the configured model's per-token price. Closes the gap where the harness tracks tokens/latency but not $ — the only way to actually prove Phase 8's cost/latency tradeoff empirically, per this project's own "prove it on every commit" principle.
- **Sensible model-tier defaults**: default frontier/mid/cheap model bindings in `src/config/model-tiers.ts` (with a per-token price alongside each, for the cost field above), so `npm run eval` works with zero env configuration for local dev/CI. BYOK env vars (`EVAL_<TIER>_PROVIDER/MODEL/API_KEY`) still override per-deployment — tiers already resolve to real models today via that mechanism, this just removes the setup friction of configuring three env vars before a first eval run.
- Workflow integrated into `runAgent()`; visible step boundaries exposed for the chat UI (built in Phase 6; step visibility wired in Phase 11).

**Key decisions**

- Validation is first-class and pluggable per step type, but external/mechanical validators are preferred over LLM-judge validators wherever the check can be expressed as code — reserve LLM calls for checks that are genuinely semantic (groundedness, tone/policy compliance).
- The single-step bypass is not a separate complexity classifier — it's a zero-extra-call branch on output the decomposer already produces. This keeps "every request goes through the same shape" true while avoiding paying for validate/compress on requests that don't need them.
- Retries and rollbacks are capped, not open-ended — the workflow is deterministic scaffolding around the model, not another autonomous prompt, and an uncapped retry loop is exactly the kind of cost/latency blowup that undermines the "works on any LLM including cheap ones" thesis.
- `runAgent()`'s signature changes here, and that's expected and scoped (unlike Phase 7, which kept it stable) — going from one model call to a multi-step loop is a real shape change, and the eval harness (`core/eval/runner.ts`) evolves alongside it.

**Definition of Done**

- A multi-step Customer Support task completes with validation; an induced failure triggers a correct retry (capped at 1) or rollback. A trivial single-step task (e.g. a grounded FAQ answer) visibly takes the bypass path — same call count as Phase 7, not Phase 8's full loop.
- Eval shows a measurable success-rate lift on the cheap tier vs the Phase 7 baseline, **and** a measured cost/latency delta (via the new `costUsd` field) reported side by side — the phase isn't done until both numbers exist together, not just the success-rate lift in isolation.

**How we test it**

- Unit: decomposition, validation hooks (both mechanical and LLM-based), rollback logic, single-step bypass triggering correctly.
- Integration: end-to-end multi-step task; forced-failure path recovers within the retry cap; forced-failure path that exceeds the cap surfaces as a workflow failure instead of looping.
- Eval: success-rate lift vs Phase 7 across all three tiers, plus cost-per-task and latency-per-task reported per tier — a regression in cost/latency without a corresponding success-rate gain should be visible in the same eval run, not just success rate in isolation.

**Sub-phases**

- **8.1 — Cost instrumentation + model-tier defaults.** `EvalRun.costUsd`, a per-token price table alongside default frontier/mid/cheap model bindings in `src/config/model-tiers.ts`. Done first so every later sub-phase's eval runs already report cost/latency side by side with success rate, instead of retrofitting it at the end.
- **8.2 — Decomposer.** `core/workflow/decompose.ts`: structured-output step planning (`generateObject`, same technique as the Phase 7 re-ranker), including the single-step-plan detection the bypass relies on. Unit-tested with a mock model.
- **8.3 — Per-step executor + context assembly.** Runs one step: assembles minimal per-step context (calling Phase 7's `retrieveGroundingContext()` with that step's own query when the step needs grounding), calls the model, returns the raw result.
- **8.4 — Validators.** Pluggable validator interface; mechanical schema/tool-result checks (code) and LLM-based groundedness checks (only on steps that used retrieval), never same-model self-critique.
- **8.5 — Compression.** Mechanical truncation/structured extraction between steps by default; LLM summarization only when a step's output genuinely exceeds the next step's context budget.
- **8.6 — Retry/rollback.** Capped retry (max 1/step) and rollback (max 1/plan) logic; a step failing twice surfaces as a workflow failure rather than looping.
- **8.7 — Orchestrator + wire into `runAgent()`.** Runs the full loop (with the single-step bypass as the fast path), exposes step-boundary events for the future Phase 11 chat UI, updates `runAgent()`'s signature and the eval harness call sites.
- **8.8 — Eval integration.** Success-rate lift vs the Phase 7 baseline, reported alongside `costUsd`/latency per tier; grounded + multi-step eval cases exercising retry/rollback.
- **8.9 — Final Phase 8 verification sweep.** Full gate across the whole phase together, plus a manual multi-step smoke test (forced validation failure → correct retry/rollback; a trivial query → visibly takes the bypass path).

---

### Phase 9 — The five specialized employees ✅ COMPLETE

**Goal:** Clone the now-proven Customer Support pattern to the other four launch employees. The work here is _content and quality_ — new personas, procedural playbooks, and knowledge — not new engineering; the agent engine (retrieval, workflow, eval) already works end-to-end from Phases 4–8.

**Deliverables**

- Author Content Writer, Research Analyst, Financial Analyst, and Team Organizer as definitions (YAML) + **procedural playbooks** + seed knowledge, mirroring Customer Support's structure (`agents/<id>/agent.yaml`, `knowledge/`, `playbooks/`).
- Each new employee runs through the existing `runAgent()` unchanged — persona, retrieval, and the Phase 8 workflow all just work once the definition/content exists.
- Eval sets for each of the 4 new employees (mirroring `evals/customer-support.json`'s structure); each must pass across all three tiers.

**Key decisions**

- No new engineering in `core/` — this phase is purely content (definitions, playbooks, knowledge, eval tasks). If something doesn't "just work" through the existing engine, that's a signal the engine has a gap, not a cue to patch around it ad hoc.
- **Tools are explicitly out of scope here** — these five employees ship on retrieval + workflow alone; tool-calling lands in Phase 10 and applies to all five at once.
- No employee ships until it passes its eval on frontier / mid / cheap.

**Definition of Done**

- All 5 employees (Customer Support + the 4 new ones) pass their eval sets on all three tiers; cheap-tier success is demonstrably close to frontier for each.

**How we test it**

- Per-employee eval suites (the gate) for each of the 4 new employees.
- Manual: spot-check each employee's voice/expertise reads distinctly — not a reskinned Customer Support with a different name.

**Sub-phases**

- **9.1 — Content Writer.** Definition + knowledge + playbooks + basic and grounded eval sets.
- **9.2 — Research Analyst.** Same shape.
- **9.3 — Financial Analyst.** Same shape.
- **9.4 — Team Organizer.** Same shape.
- **9.5 — Final Phase 9 verification sweep.** Seed + ingest all 5 employees together, full gate, cross-employee voice/distinctness check, close out the phase.

---

### Phase 10 — Tool system (built-in + MCP connectors) ✅

**Goal:** Give all five employees the ability to act, not just answer — from exactly two sources. **Built-in tools**: a small, platform-maintained set of local, no-network operations (file format conversion, basic utilities) available to any agent whose definition declares them, no connection step required. **MCP connectors**: third-party service integrations, exclusively through the Model Context Protocol — a curated directory of real, popular MCP servers users can one-click connect to, plus a custom-connector option for any MCP server a user already has. No generic HTTP tools, no arbitrary user-defined API integrations outside MCP — those two sources are exhaustive. The MCP half matches where the industry has actually converged: Claude's Connectors is a wide directory-of-connectors model (hundreds of listed servers, tiered trust labels); ChatGPT's is a small first-party list plus bring-your-own-URL. Our (curated directory) + (custom URL) plan sits on the same real, currently-shipping pattern, not a hypothetical third approach.

**Deliverables**

- **Built-in tools** (`core/tools/`, framework-agnostic, no network calls): file format conversion (PDF → text, DOCX → text/Markdown, Markdown → HTML) and a handful of basic utilities (calculator/expression evaluator, word/character count, date & timezone math) — plain AI SDK `tool()` functions backed by local npm libraries. Enabled per-agent through the agent definition's existing `abilities` field (already wired into the Hire wizard's Abilities step since Phase 6) — no new data model, no connection/auth step, since these never leave our own server.
- **MCP client core** (`core/mcp/`, framework-agnostic): the protocol layer for both of MCP's client-facing surfaces — `tools/list`/`tools/call` (paginated discovery + invocation) **and** `resources/list`/`resources/read` (paginated discovery + reading a server's exposed data) — over the Streamable HTTP transport, JSON-RPC 2.0 message handling, and the spec's two distinct tool-error channels: a protocol-level error (unknown tool, bad schema — a client bug or stale `tools/list` cache, shouldn't reach the model) vs. a `tools/call` response with `isError: true` (the tool ran but failed — its `content` text should reach the model so it can retry or adapt, exactly like any other step failure in Phase 8's retry design). A resource a step reads becomes context for that step the same way retrieved knowledge already works, not a separate mechanism.
- **MCP authorization**: an OAuth 2.1 client implementing the spec's discovery flow — `401` + `WWW-Authenticate` → Protected Resource Metadata (RFC 9728) → Authorization Server metadata (RFC 8414 / OIDC discovery) → PKCE (`S256`, mandatory) → the `resource` parameter (RFC 8707, binds a token to one specific server) → token exchange → refresh (reactive on 401, proactive before expiry, handling refresh-token rotation). Dynamic Client Registration (RFC 7591) is the MVP registration path — simpler to implement than Client ID Metadata Documents (CIMD), the newer approach Anthropic is steering toward at their scale; CIMD/pre-registered credentials are a future optimization, not required for launch. A simpler **`static_headers` mode** (a fixed bearer token/API key, entered once) covers MCP servers that don't implement OAuth at all — this mirrors exactly the two auth patterns Claude's own connector platform ships today (confirmed via their public connector-building docs), not a simplification we're inventing.
- **Data model**: `McpServer` (a directory entry or a user's custom server, including a cached capability list — tools and resources — and an optional pre-registered OAuth client id/secret for servers that need one), `McpConnection` (a user's per-server OAuth tokens or static credential, encrypted via the same AES-256-GCM vault pattern as `ProviderKey`), `AgentMcpServer` (per-agent enablement).
- **Starter directory**: ~10-12 real, independently-verified MCP servers seeded as directory content — Notion, Canva, Stripe, Linear, Asana, Atlassian, Box, Figma, HubSpot, Intercom, Microsoft 365, monday.com. This is a starting catalog, not an attempt to match Claude's much larger (reportedly hundreds-strong) directory — adding more servers later is content work (a new `McpServer` row), not engineering work.
- **Connectors UI rebuild** (MCP only — built-in tools surface in the existing Hire-wizard Abilities step instead, since they need no connection step): a list page of connector cards grouped by category, each opening a detail dialog on click — description, example prompts, developer, tool list + count, categories, an Author/Capabilities/Connector-URL details panel, Documentation/Support/Privacy-Policy links, and a Connect button — modeled directly on Claude's own connector detail view (including its "only use connectors from developers you trust" disclaimer for non-verified entries). Plus an "Add custom connector" flow: paste an MCP server URL (+ optional advanced auth settings) for any server not in the directory.
- **Workflow integration**: both built-in tool calls and MCP tool calls/resource reads become available during step execution (Phase 8's `executeStep`) — a step that needs one calls it as part of running that step, and the result (including an `isError: true` execution failure) is validated and can trigger the existing capped retry, exactly like any other step output. No separate tool-specific validation path.

**Key decisions**

- **Exactly two tool sources, cleanly separated.** Built-in tools are platform-maintained, local, and enabled via the agent's existing `abilities` list — no connection, no per-user credential, no directory listing. MCP connectors are third-party, per-user-connected via the new Connectors UI, and require the OAuth/static-header auth flow. No generic HTTP tools and no arbitrary user-defined API integrations outside MCP, in either case.
- **The MCP client supports both Tools and Resources.** Same transport/JSON-RPC plumbing either way, so the incremental cost is low, and several real connectors (filesystem-style servers, repo browsers) rely on Resources for read access rather than Tools.
- **Per-user OAuth tokens, not platform-wide credentials.** Every MCP connection is scoped to (user, MCP server) — confirmed as the correct model even for Anthropic's own pre-registered-credential connectors, which still require a live per-user consent screen rather than a server-to-server grant. A shared/admin-level credential is a possible future extension, not the default.
- **The `resource` parameter (RFC 8707) is non-negotiable.** It binds an issued token to the exact MCP server it was issued for, preventing a token minted for one connector from being replayed against another (the spec's explicit anti-"confused deputy" protection).
- **Static-header auth is a first-class fallback, not an afterthought.** Not every MCP server implements OAuth; a fixed bearer token/API key mode needs to work just as reliably as the OAuth path.
- **Tool and resource results flow through the existing per-step validation (Phase 8.4) rather than a separate tool-specific check** — any of these is just another kind of step output, and an `isError: true` result is just another kind of step failure eligible for the same capped retry.

**Definition of Done**

- A built-in tool (e.g. PDF-to-text conversion) works end-to-end for an employee. Separately, a user connects at least one directory connector (full OAuth flow) and one custom connector (arbitrary MCP server URL, either auth mode), enables both for an employee, and that employee successfully calls a tool — and reads a resource, from at least one connector that exposes one — mid-conversation, with results flowing correctly into its reply. A forced tool failure (`isError: true`) is fed back into the workflow's retry, per Phase 8's existing capped-retry design.

**How we test it**

- Unit: built-in tool conversions against real sample files (a real PDF/DOCX fixture — pure local computation, nothing to mock). MCP client protocol handling (`tools/list`/`tools/call` and `resources/list`/`resources/read` pagination and invocation, the two error channels) against a mock MCP server — no real network calls.
- Integration: the OAuth discovery/PKCE/refresh flow against a mock authorization server; the static-headers mode; a full connector-directory seed load; per-agent tool enablement; a resource-read flow.
- E2E: an employee converts an uploaded/pasted file with a built-in tool. Separately: browse the directory → connect a connector → enable it for an employee → the employee calls its tool (and reads a resource, if available) in a live chat.

**Sub-phases**

- **10.1 — Built-in tools.** `core/tools/`: PDF/DOCX/Markdown format conversion + basic utilities (calculator, word count, date/timezone math). Unit-tested against real sample files, no mocking needed.
- **10.2 — MCP client core.** `core/mcp/`: JSON-RPC 2.0 over Streamable HTTP; `tools/list`/`tools/call`; `resources/list`/`resources/read`; the protocol-error vs. `isError` distinction. Framework-agnostic, unit-tested against a mock MCP server.
- **10.3 — MCP OAuth 2.1 client.** Discovery (Protected Resource Metadata, Authorization Server metadata), PKCE, Dynamic Client Registration, the `resource` parameter, token exchange, and refresh (reactive + proactive, handling refresh-token rotation).
- **10.4 — Static-headers auth + the connection vault.** The simpler fixed-token/API-key mode; `McpConnection`'s encrypted-credential storage (same AES-256-GCM vault as `ProviderKey`), keyed per (user, server).
- **10.5 — Data model + starter directory.** `McpServer` / `McpConnection` / `AgentMcpServer` Prisma models; seed ~10-12 real, verified MCP servers as directory content.
- **10.6 — Connectors UI.** List page (real directory data replacing the Phase 6 fixtures) + detail dialog (Canva-style layout) + custom-connector add flow + per-agent enable/disable.
- **10.7 — Wire built-in tools + MCP tools/resources into `runAgent()`/the workflow.** Both tool sources become callable during `executeStep`; MCP resource reads become step context; results (including `isError`) flow through validation and the existing capped retry.
- **10.8 — Final Phase 10 verification sweep.** Full gate; end-to-end smoke test covering a built-in tool, a directory connector, and a custom connector.

---

### Phase 11 — Chat: real-time, persistence & visible steps ✅

**Goal:** Make the chat surface (UI shell built in Phase 6) fully real: durable history and visible workflow steps.

**Where things actually stand today (confirmed by investigation before writing this section):** `/api/chat` streams **raw plain text** — no framing, no `conversationId` anywhere in the client/API/DB, and the client hook resends the _entire_ message transcript on every turn (the server has no memory of a conversation at all). `WorkflowStepEvent`/`onStepEvent` (Phase 8) already works end-to-end inside `core/workflow`/`core/agent`, but `server/agents/service.ts`'s `streamAgentChat()` never passes the callback through — that wire has been sitting unconnected since Phase 8. The model picker (provider dropdown scoped to `listUserProviders()`, free-text model field) is genuinely real, not fixture, and already correct per Phase 6. Chat history (`fixtures.ts`, `ConversationSummary[]`) is entirely fake — deterministically hashed fake titles/dates, no relation to real messages; selecting a history item today only switches the employee, it doesn't load any messages (there are none to load).

**Deliverables**

- **Persistence:** `Conversation`/`Message` models + repository. The server becomes the source of truth for a conversation's history — the client stops resending the full transcript every turn once a `conversationId` exists. The Phase 6 chat UI and History drawer read/write real conversations, replacing `fixtures.ts` entirely.
- **Visible tool-call / workflow steps** streamed into the thread, powered by Phase 8's step boundaries. This requires replacing `/api/chat`'s raw-text stream with the AI SDK's UI Message Stream protocol (`createUIMessageStream` + its client-side parser) rather than inventing a bespoke framing — it already has a "data" part type suited to exactly this, and gives us a real client parser instead of a hand-rolled one. `onStepEvent` gets wired from `runAgent()` through `streamAgentChat()` into the route for the first time.
- Confirm the model picker (already real) survives multi-turn conversations and long streams under the new persistence + streaming-protocol changes.
- Clean, structured BYOK error handling inline in chat — no more `\n\n⚠️ {message}` appended into the assistant's text bubble; an error becomes its own distinguishable part in the new stream protocol.

**Key decisions**

- **The server, not the client, owns conversation history.** Once a `conversationId` exists, the client sends only the new user message; the server loads prior turns from `Message` itself before calling `runAgent()`. This is a correctness fix as much as a persistence feature — resending the whole transcript from client state was fragile and made "reload shows history" impossible to satisfy honestly.
- **Adopt the AI SDK's UI Message Stream protocol instead of a custom one.** The current plain-text stream has no room for a second content type (step events) without inventing a delimiter scheme from scratch; the AI SDK already ships this exact capability (text parts + data parts + a client-side stream parser), and Roster's tech stack is already committed to the AI SDK as the provider abstraction — reusing its streaming protocol is the "environment over reinventing" call, not scope creep.
- **`stepEvents` persist per assistant message (JSON column), not in a separate table.** A step event only ever belongs to the one assistant turn that produced it, and reloading a conversation needs to re-render them next to that turn — no query ever needs to filter/join on individual step events across messages.

**Definition of Done**

- A user picks an employee and a model, chats with streaming responses, sees tool/workflow steps live during a turn, and reloading the page (or picking the conversation from History) shows the exact same thread, steps included.
- A forced BYOK error (bad key, rate limit) surfaces as a clean, structured error in the thread — not text spliced into an assistant reply.

**How we test it**

- Unit: the `Conversation`/`Message` repository; the stream-protocol encode/decode round trip (text + step-event parts) in isolation.
- Integration: `streamAgentChat()` persists both turns of a conversation and threads `onStepEvent` into stored `stepEvents`, mirroring `agent-run.test.ts`'s existing mock-provider pattern; a second turn against an existing `conversationId` loads real prior messages rather than trusting client-sent history; the History drawer lists real conversations for a user.
- E2E: pick employee + model → streamed multi-turn conversation with visible steps → reload shows the same history including steps → a forced provider error renders as a distinct error state, not garbled into the reply text.

**Sub-phases**

- **11.1 — Data model.** `Conversation`/`Message` Prisma models + repository (list conversations for a user, get one with its messages, create a conversation, append a message). No wiring into the API/UI yet.
- **11.2 — Persistence wired into `/api/chat` + the chat hook.** A turn creates or reuses a `conversationId`; the server loads prior messages from the DB (not client-resent history) before calling `runAgent()`; both turns of the exchange get persisted afterward.
- **11.3 — History drawer + conversation switching on real data.** Replaces `fixtures.ts`; selecting a past conversation loads its real messages into the thread.
- **11.4 — Visible workflow/tool-call steps + structured error handling.** Switch `/api/chat` to the AI SDK's UI Message Stream protocol; wire `onStepEvent` through `streamAgentChat()`; render live step events and structured BYOK errors in `ChatThread`; persist `stepEvents` per assistant message so reloads reproduce them.
- **11.5 — Final Phase 11 verification sweep.** Full gate; end-to-end smoke test covering a multi-turn conversation with visible steps, a page reload, and a forced provider error.

---

### Phase 12 — REST API & platform keys ⬅️ NEXT

**Goal:** Programmatic access to the same employees, for developers and integrations — one engine (`runAgent()`), two surfaces (the chat UI from Phase 11, and this REST API).

**Where things actually stand today (confirmed before writing this section):** Phase 6 already built the employee-detail "API access" tab with real, unit-tested code snippets (`detail-api-snippets.ts`) documenting the exact intended contract: `POST /v1/agents/{id}/chat`, `Authorization: Bearer YOUR_API_KEY`, body `{"messages": [{"role": "user", "content": "..."}]}` — no `conversationId`, no `provider`/`model` shown in the simple case. That contract is the source of truth for what Phase 12 has to actually implement. The Settings "API keys" tab (`api-keys-tab.tsx`) is a full fixture (local React state, an id-derived fake prefix, no server at all). Neither `ApiKey` nor any `/v1/` route exists yet; `server/ratelimit/` is an empty placeholder directory with no rate-limiting code at all, and no Upstash/Redis dependency is installed.

**Deliverables**

- **`ApiKey` data model**: userId, label, `keyPrefix` (shown in the UI, e.g. `rk_live_4f2a9c`), `hashedKey` (SHA-256 of the full key), `lastUsedAt`, `revokedAt`.
- **Rate-limiting abstraction**: a `RateLimiter` interface with an in-memory implementation (the default — fully offline-testable, no external service required) and an Upstash-Redis-backed implementation that activates only when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are configured — the same "bring your own backend, nothing hardcoded" treatment the database and LLM providers already get.
- **`POST /v1/agents/{id}/chat`** (versioned): authenticated by `Authorization: Bearer rk_live_...` (hashed lookup → `userId`, never a session cookie). Body: `{messages, provider?, model?, apiKey?, baseUrl?}` — `provider`/`model` default to the agent's own configured default model (`AgentDefinition.model`, set by the Hire wizard since Phase 6) when omitted, matching the simple documented contract exactly; `apiKey`/`baseUrl`, when present, let a caller use a key that was never stored in their account at all (the "per-request key" mode) instead of a stored provider key. Rate-limited per user. Same BYOK error taxonomy as chat, returned as clean JSON.
- **API key management UI** (`settings/api-keys/`), wired to real data — replacing the Phase 6 fixture: create (the full key is shown exactly once), list (masked prefix, created, last used), revoke.
- Confirm the Phase 6 "API access" tab's snippets still match the real, now-implemented contract.

**Key decisions**

- **The API calls the exact same `runAgent()` as chat — one engine, two surfaces.** `server/agents/service.ts`'s `streamAgentChat()` gains an optional ephemeral-key override so it can resolve a model from either a stored provider key (chat UI, and the REST API's default mode) or a request-supplied key (REST-only), without forking the engine.
- **The REST surface is stateless, unlike the chat UI.** No `conversationId`, no `Conversation`/`Message` persistence — a caller supplies its own message history each call, exactly like OpenAI's own chat-completions convention and exactly like Phase 6's already-documented snippet. Conversation persistence is a chat-UI-specific feature (Phase 11), not part of the REST contract.
- **Platform API keys are hashed, never encrypted/decrypted.** Unlike BYOK provider keys (AES-256-GCM, decrypted at request time because the raw key must reach the provider), a platform key only ever needs to be _compared_ — SHA-256 hashed at creation, the raw value shown to the user exactly once and never retrievable again (the same pattern GitHub PATs / Stripe restricted keys use).
- **Rate limiting is configurable, not hardcoded to Upstash.** An in-memory limiter is the default and what every test runs against; Upstash activates only when its env vars are present.
- **Versioned from day one (`/v1`).**

**Definition of Done**

- A `curl` request with a platform key streams an agent response; a revoked or invalid key is rejected with a clean 401; exceeding the rate limit returns a clean 429; a per-request provider key works without ever being stored.

**How we test it**

- Unit: API-key hashing/prefix generation; the in-memory rate limiter's window/reset behavior.
- Integration: the full route — a valid key streams a reply, an invalid/revoked key 401s, the rate limit enforces and resets, both provider-key modes (stored vs. per-request) resolve correctly, the BYOK error taxonomy matches the chat surface.
- E2E: create a platform key in Settings → call the API with it → get a streamed response. (Same environment limitation noted in Phases 10–11: no way to click through a real signed-in browser session here — substituted with integration tests hitting the route directly.)

**Sub-phases**

- **12.1 — `ApiKey` data model + rate-limiter abstraction.** ✅ Prisma model + repository (create/list/revoke, hash+prefix generation). `RateLimiter` interface + in-memory implementation; an Upstash-backed implementation wired but inert unless configured. No route wiring yet.
- **12.2 — `POST /v1/agents/{id}/chat`.** ✅ Platform-key auth, rate limiting, both provider-key modes, calls `runAgent()` via an extended `streamAgentChat()`, consistent error taxonomy.
- **12.3 — API key management UI, wired to real data.** ✅ Replaces the Phase 6 fixture in `settings/api-keys/`; confirms the employee-detail API tab's snippets match the real contract.
- **12.4 — Final Phase 12 verification sweep.**

---

### Phase 13 — Polish & ship (private beta)

**Goal:** A coherent, fast, sub-2-minute onboarding and a shippable private beta.

**Deliverables**

- Landing page with employees as "hire" cards.
- **Onboarding under 2 minutes**: sign in → add key → pick employee → chat.
- Sentry error tracking, basic product analytics, in-app feedback button.
- Final UI polish pass across the app (the design-faithful UI shipped in Phase 6; this is launch-readiness refinement, empty/loading/error states, a11y sweep).
- Deployment hardening (function duration limits for long streams, env/secrets, DB pooling) on the chosen host.

**Definition of Done**

- A brand-new user reaches their first employee response in under 2 minutes. Errors report to Sentry; feedback works. Private beta is live.

**How we test it**

- E2E: full cold-start onboarding flow timed under 2 minutes.
- Manual: cross-employee smoke test on cheap + frontier models; error paths verified in Sentry.

---

## 9. Definition of done (MVP)

- [ ] Foundation: configurable Postgres + pgvector via Prisma; Google OAuth sign-in end-to-end.
- [ ] BYOK works for the target providers (key + baseURL + config) with clean error handling.
- [ ] All 5 employees pass their eval sets across frontier / mid / cheap tiers.
- [ ] Cheap-model success rate is demonstrably close to frontier (the selling point, proven).
- [ ] Design-faithful, component-based UI (all screens, light/dark, responsive) built on a shared `ui/` design system.
- [ ] Chat + REST API both functional, both flowing through the same `runAgent()`.
- [ ] Per-agent tools working: at least one built-in tool, one directory MCP connector, and one custom-URL MCP connector, all callable end-to-end.
- [ ] Onboarding to first response under 2 minutes.
- [ ] Key vault encrypted (AES-256-GCM); permission-scoping enforced on retrieval.
- [ ] Eval gate wired into CI; no change ships that regresses any tier.

---

## 10. Sequencing reminders

- **Foundation first, then BYOK, then the engine.** Don't touch agent complexity until sign-in and a raw streamed completion both work end-to-end (Phases 1–3).
- **Build the eval harness before retrieval and workflow (Phase 5).** Every capability after it is validated across tiers as it lands — that's how "works on any LLM" stays true rather than aspirational.
- **Go vertical on Customer Support** through the agent-engine phases (4–5, 7–8) before cloning to the other four in Phase 9.
- **Spend disproportionate time on the retrieval re-ranker and the procedural playbooks.** That's where the "works on any LLM" magic actually lives.
- **Keep `core/` and `agents/` framework-agnostic.** They are the moat and the future open spec — don't let Next.js leak into them.
- **The full design-faithful UI lands in Phase 6**, then backend phases light up each screen by swapping a fixture for real data — no UI rework. Final launch polish (landing, onboarding, Sentry, analytics) is Phase 13.

---

## 11. Out of scope (MVP)

24/7 automation workflows (own research phase) · multi-agent orchestration / agents calling agents · fine-tuned per-agent models · community marketplace (design the _format_ now, build the market later) · fine-grained enterprise RBAC beyond basic permission-scoping.

```

```
