# Roster

**Roster** — a platform of hireable, specialized AI agents that perform like domain experts on **any** LLM the user brings — including cheap/open models (Gemini Flash, open-weight). Users connect their own provider key (BYOK), pick an employee, and work through chat or REST API.

**Core thesis:** The model is a commodity; the engineering scaffolding around it is the product. Open-weight models reach ~80% of frontier performance when wrapped in a validated, structured environment. Most agent failures are *context* failures, not model failures — so we invest in the environment, not in picking the "best" model.

> Full detail lives in `Product-Overview.md` (the pitch) and `MVP-Plan.md` (the build plan). This file is the quick orientation for a fresh session.

## The 5 launch employees
Customer Support · Content Writer · Research Analyst · Financial Analyst · Team Organizer.

Each has an identity/voice, domain expertise, **procedural know-how** (how an expert solves recurring problems), tools, and cross-session memory. That procedural layer is the differentiator — not raw knowledge.

## The Agent Engine (the product — spend time here)
Everything else is plumbing.

- **Agent definition** — each employee is a portable YAML/JSON spec, *never hardcoded*. Becomes the future marketplace format.
- **Four-layer memory** — semantic (domain knowledge, `pgvector`), procedural (expert playbooks as markdown decision trees), episodic (per-user history), working (session). Retrieved separately, assembled per query.
- **Retrieval pipeline** — hybrid (vector + BM25) → 30–50 candidates → re-ranker → keep top 3–5 → **hard cap** at the agent's `context_budget_tokens`. Never dump raw chunks. Less context, not more — this matters most for weak models.
- **Structured workflow** — decompose → execute → validate → rollback, compressing intermediate results. Not one big autonomous prompt.
- **`runAgent()`** — single entry point: loads definition → resolves provider/model → runs retrieval → attaches tools → executes workflow → returns a stream.
- **Eval harness** — the moat, made measurable. Built in Phase 1, not last. Every change runs against 3 model tiers (frontier / mid / cheap). A change ships only if success rate holds or improves across *all three*.

## Guiding principles (non-negotiable)
1. Environment over model.
2. Less context, not more (tight, re-ranked, hard-capped).
3. Encode *how* an expert thinks, not just *what* they know.
4. Prove it on every commit (eval across tiers).
5. Build vertically — one employee end-to-end before the other four.

## Tech stack (deliberately lean)
- **Framework:** Next.js 15 (App Router) + TypeScript (strict)
- **AI:** Vercel AI SDK v5 — unified 15+ provider abstraction; `createOpenAICompatible` + provider registry make configurable BYOK (key + baseURL + per-provider config) nearly free
- **DB:** PostgreSQL + `pgvector`, **provider-agnostic** — any Postgres via `DATABASE_URL` (local Docker, EC2, Supabase, Neon, RDS). Only requirement: pgvector installable
- **ORM/migrations:** Prisma (pgvector via custom migration + `Unsupported("vector")` + raw/TypedSQL for `<=>` — native vector type not in Prisma yet as of mid-2026)
- **Auth:** Auth.js (NextAuth v5) + Google OAuth (`@auth/prisma-adapter`)
- **UI:** Tailwind CSS only — hand-rolled light kit, **no shadcn/ui** (keep it light; UI improves phase by phase)
- **Validation:** Zod (env, API input, agent definitions)
- **Testing:** Vitest + Playwright + custom eval harness
- **Rate limiting:** Upstash/Redis · **Errors:** Sentry
- **Deploy:** Vercel or any Node host / Docker (not locked to Vercel)

## Access surfaces
- **Chat** — streaming UI, agent switcher, history, visible tool-call steps, model picker scoped to the user's configured providers.
- **REST API** — `POST /v1/agents/{id}/chat`, authenticated by platform API key, per-user rate limiting.

## Data model (Supabase)
`users` · `provider_keys` (encrypted) · `agents` · `agent_knowledge` (chunk + embedding + permissions) · `playbooks` · `conversations`/`messages` · `tools` · `agent_tools` · `api_keys` · `eval_runs`.

## Security / governance (from day one)
- BYOK keys: **AES-256-GCM** encrypted with a server-side secret, validated with a 1-token ping on save, never stored raw, never logged, decrypted only inside the API route at request time.
- `agent_knowledge.permissions` scopes what each agent may recall — permission-scoping enforced on retrieval.

## Build sequence (11 phases — see `MVP-Plan.md` §8 for full detail)
Foundation → prove BYOK end-to-end → build the engine capability-by-capability (each measured by the eval harness) → employees → surfaces → ship. Every phase is independently testable and leaves `main` working.

1. **Foundation** — scaffolding, tooling, configurable Postgres + Prisma + pgvector, Docker dev DB
2. **Auth & app shell** — Google OAuth end-to-end (foundation complete)
3. **LLM provider layer + BYOK vault** — AI SDK, provider registry (key/baseURL/config), encrypted vault, playground → BYOK proven e2e
4. **Agent definition spec + `runAgent()` skeleton** — persona chat, no retrieval yet
5. **Eval harness** — built early, on purpose; CI gate across 3 tiers
6. **Memory & retrieval** — four-layer memory, hybrid retrieval, re-ranker, hard cap, permission-scoping
7. **Structured workflow** — decompose → execute → validate → rollback
8. **The 5 employees + tools** — clone the proven pattern; built-in + MCP/HTTP tools (content/quality work, not new eng)
9. **Chat interface** — streaming UI, agent switcher, history, visible tool steps, scoped model picker
10. **REST API + platform keys** — same `runAgent()`, versioned, rate-limited
11. **Polish & ship** — landing, <2-min onboarding, Sentry, analytics, private beta

**Vertical first:** Customer Support goes through Phases 4–7 end-to-end before the other four are cloned in Phase 8. Spend disproportionate time on the retrieval re-ranker and the procedural playbooks — that's where "works on any LLM" actually lives. Keep `core/` and `agents/` framework-agnostic (the moat + the open spec). UI is intentionally minimal until Phase 11.

## Explicitly out of scope (MVP)
24/7 automation workflows · multi-agent orchestration · fine-tuned per-agent models · community marketplace (design the *format* now, build the market later) · deep enterprise RBAC.
