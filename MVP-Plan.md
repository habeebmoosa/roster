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
│  │  ├─ tools/                    # built-in tools + MCP/HTTP tool adapters
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
│  ├─ features/                    # feature modules (dashboard, roster, chat, connectors, settings, hire)
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

| Model                                       | Key fields                                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `User`                                      | from Auth.js (id, email, name, image)                                                                                         |
| `Account` / `Session` / `VerificationToken` | Auth.js Prisma adapter tables                                                                                                 |
| `ProviderKey`                               | userId, provider, **encryptedKey (AES-256-GCM)**, baseUrl, config (JSON — headers, org, region, api-version, etc.), createdAt |
| `Agent`                                     | id, name, role, definition (persona/voice/expertise), defaultTools                                                            |
| `AgentKnowledge`                            | agentId, chunk, embedding (`vector`), source, **permissions**                                                                 |
| `Playbook`                                  | agentId, name, content (markdown decision tree)                                                                               |
| `Conversation` / `Message`                  | userId, agentId, history                                                                                                      |
| `Tool`                                      | name, description, JSON schema, type (builtin/mcp/http), config                                                               |
| `AgentTool`                                 | which tools attached to which agent for which user                                                                            |
| `ApiKey`                                    | hashed platform API keys for programmatic access                                                                              |
| `EvalRun`                                   | agentId, modelTier, successRate, tokens, retrievalPrecision/Recall, latency, timestamp                                        |

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

**~12 phases.** Foundation (1–2) → BYOK/AI proven end-to-end (3) → agent-engine skeleton + eval harness (4–5) → full product frontend from the design (6) → agent engine built and measured capability-by-capability (7–9) → chat real-time & access surfaces (10–11) → ship (12). Each phase is independently testable and leaves `main` in a working state.

> **Progress:** ✅ Phases 1–5 complete · ⬜ Phase 6 (Frontend — design system & application UI) is next · ⬜ Phases 7–12 remaining.

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

### Phase 6 — Frontend: design system & application UI ⬅️ NEXT

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
      roster/page.tsx               # Employee list
      roster/[employeeId]/page.tsx  # Employee detail (stats, about, API access)
      chat/page.tsx                 # Employee chat
      connectors/page.tsx           # Tool/integration catalog
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
    roster/     { components/ (employee-card, employee-table, filters, detail/*), … }
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

- **Overview / Dashboard** — greeting; stat tiles (active employees, conversations · 30d, spend this month, eval success rate); "Your roster" preview; "Usage & cost" per-employee breakdown; recent activity; quick actions (hire / add connector / open settings). _Wire now:_ eval success from `EvalRun`; agents from DB. _Fixtures:_ spend/convos/tokens analytics.
- **Roster** — employee table (tag/avatar, name, role, status, model, convos, spend) with filter/display controls + pagination; **Hire employee** CTA. _Wire now:_ agents list. _Fixtures:_ per-employee metrics.
- **Employee detail** (`/roster/[id]`) — header (avatar, status, role, Pause/Edit); stat row (conversations, spend, tokens, uptime); tabs; **About** (identity/voice from the definition); recent activity; **model** (provider/tier + "Change model"); **API access** (auth toggle: API key / none, endpoint `POST /v1/agents/{id}/chat`, copyable code snippet in multiple languages). _Wire now:_ definition fields. _Fixtures:_ metrics, activity.
- **Chat** — employee switcher, **New chat**, **History** drawer, message thread (user/assistant bubbles, streaming), composer, model indicator + switcher. _Wire now:_ streams through the existing agent-chat endpoint (`runAgent()`). _Fixtures:_ saved history list (real persistence arrives Phase 10).
- **Connectors** — tools grouped by category, connector cards (icon, name, desc, connect/manage), "synced" status. _Fixtures now_ (real tools/MCP arrive Phase 9).
- **Settings** — tabs: **Workspace** (name, URL, timezone, appearance/theme, delete workspace); **Profile** (avatar, name, email, 2FA, change/delete); **Providers** (reuse the real Phase 3 BYOK UI, restyled to the design); **API keys** (create/revoke — fixtures now, real in Phase 11); **Billing** (plan, payment, invoices — fixtures now).
- **Hire a new employee** (`/hire`) — 6-step wizard with a stepper: (1) role, (2) basic details, (3) knowledge base (upload / connect source), (4) abilities (tool toggles), (5) provider & model (BYOK), (6) review & create + live preview. Back / Continue / Save & exit. _Wire now:_ provider/model from the real catalog + saved keys; create writes an `Agent` (definition). _Fixtures:_ knowledge upload, abilities catalog (real in Phases 7 & 9).

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

### Phase 7 — Memory & retrieval pipeline

**Goal:** Grounded answers from curated context. Semantic + procedural + episodic memory, hybrid retrieval, re-ranking, hard cap, permission-scoping — all measured by the Phase 5 harness.

**Deliverables**

- **Ingestion pipeline**: chunk `agents/*/knowledge/` docs → embed (via a configured provider) → store in `AgentKnowledge` (pgvector).
- **Procedural memory**: load `playbooks/` markdown; **episodic memory**: per-user history/preferences store.
- **Hybrid retrieval** (`core/retrieval/`): pgvector similarity + Postgres full-text (BM25-style) → 30–50 candidates.
- **Re-ranker**: cross-encoder or small-model scoring → keep top 3–5.
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

### Phase 8 — Structured workflow engine

**Goal:** Turn one big prompt into a disciplined loop — decompose → execute → validate → rollback — closing the gap on weaker models.

**Deliverables**

- Workflow engine in `core/workflow/`: decompose a task into verifiable sub-steps; per step assemble minimal context → call the model → **validate** output.
- Retry / rollback on validation failure; **compression** of intermediate results before folding into the next step.
- Validation hooks (schema checks, groundedness checks, tool-result checks).
- Workflow integrated into `runAgent()`; visible step boundaries exposed for the chat UI (built in Phase 6; step visibility wired in Phase 10).

**Key decisions**

- Validation is first-class and pluggable per step type.
- The workflow is deterministic scaffolding around the model, not another autonomous prompt.

**Definition of Done**

- A multi-step Customer Support task completes with validation; an induced failure triggers a correct retry/rollback. Eval shows another success-rate lift, especially on the cheap tier.

**How we test it**

- Unit: decomposition, validation hooks, rollback logic.
- Integration: end-to-end multi-step task; forced-failure path recovers.
- Eval: measurable error reduction vs Phase 7 across all tiers.

---

### Phase 9 — The five employees + tools

**Goal:** Clone the now-proven pattern to all five employees, and add the tool system (built-in + user-added via MCP/HTTP). The work here is _content and quality_, not new engineering.

**Deliverables**

- Author the other four employees as definitions + **procedural playbooks** + knowledge: Content Writer, Research Analyst, Financial Analyst, Team Organizer.
- **Built-in tools** as AI SDK `tool()` functions (per-role: kb lookup, web search, URL fetch, calculator, CSV/spreadsheet analysis, task breakdown, etc.).
- **User-added tools** via **MCP** (headline: "connect any MCP server to your AI employee") and generic **HTTP** tools; `Tool` / `AgentTool` wiring + per-agent enablement UI.
- Eval sets for all five employees; each must pass across all three tiers.

**Key decisions**

- MCP is the preferred extensibility path; HTTP is the fallback.
- No employee ships until it passes its eval on frontier / mid / cheap.

**Definition of Done**

- All five employees pass their eval sets on all three tiers; cheap-tier success is demonstrably close to frontier. At least one built-in and one user-added (MCP or HTTP) tool work end-to-end.

**How we test it**

- Per-employee eval suites (the gate).
- Integration: tool invocation (built-in + MCP + HTTP), including tool-error handling.
- E2E: each employee handles a representative task with tools.

---

### Phase 10 — Chat: real-time, persistence & visible steps

**Goal:** Make the chat surface (UI shell built in Phase 6) fully real: durable history and visible workflow steps.

**Deliverables**

- **Persistence:** `Conversation`/`Message` models + repository; the Phase 6 chat UI and History drawer now read/write real conversations (replacing the fixture history).
- **Visible tool-call / workflow steps** ("🔍 searching knowledge base…", "✅ validating…") streamed into the thread — powered by Phase 8's step boundaries.
- Model picker scoped to the user's configured providers (already wired in Phase 6); confirm multi-turn + long-stream robustness.
- Clean handling of BYOK errors inline in chat.

**Definition of Done**

- A user picks an employee and a model, chats with streaming responses, sees tool/workflow steps, and their history persists.

**How we test it**

- E2E: pick employee + model → streamed multi-turn conversation with visible steps → reload shows history.
- Integration: model picker only offers configured providers; streaming survives long responses.

---

### Phase 11 — REST API & platform keys

**Goal:** Programmatic access to the same employees, for developers and integrations.

**Deliverables**

- `POST /v1/agents/{id}/chat` (versioned), authenticated by **platform API key** (`ApiKey`, hashed).
- Accepts either a reference to a stored provider key or a per-request key.
- **Per-user rate limiting** via Upstash/Redis; consistent BYOK error responses.
- API key management UI (`settings/api-keys/`); minimal API docs.

**Key decisions**

- The API calls the exact same `runAgent()` as chat — one engine, two surfaces.
- Versioned from day one (`/v1`).

**Definition of Done**

- A `curl` request with a platform key streams an agent response; rate limits enforce; invalid keys / quota errors return clean, specific responses.

**How we test it**

- Integration: auth, rate limiting, both key-passing modes, error taxonomy.
- E2E: create platform key in UI → call the API → get a streamed response.

---

### Phase 12 — Polish & ship (private beta)

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
- [ ] Per-agent tools working (built-in + at least one user-added mechanism: MCP or HTTP).
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
- **The full design-faithful UI lands in Phase 6**, then backend phases light up each screen by swapping a fixture for real data — no UI rework. Final launch polish (landing, onboarding, Sentry, analytics) is Phase 12.

---

## 11. Out of scope (MVP)

24/7 automation workflows (own research phase) · multi-agent orchestration / agents calling agents · fine-tuned per-agent models · community marketplace (design the _format_ now, build the market later) · fine-grained enterprise RBAC beyond basic permission-scoping.

```

```
