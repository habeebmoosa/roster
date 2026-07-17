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

## Tech stack
- **Framework:** Next.js 15 (App Router) + TypeScript, deployed on Vercel
- **AI:** Vercel AI SDK (unified 15+ provider abstraction — makes BYOK nearly free, first-class tools & streaming)
- **DB:** Supabase (Postgres + `pgvector`)
- **Auth:** Auth.js (NextAuth v5) + Google OAuth
- **UI:** shadcn/ui + Tailwind
- **Rate limiting:** Upstash Redis
- **Errors:** Sentry

## Access surfaces
- **Chat** — streaming UI, agent switcher, history, visible tool-call steps, model picker scoped to the user's configured providers.
- **REST API** — `POST /v1/agents/{id}/chat`, authenticated by platform API key, per-user rate limiting.

## Data model (Supabase)
`users` · `provider_keys` (encrypted) · `agents` · `agent_knowledge` (chunk + embedding + permissions) · `playbooks` · `conversations`/`messages` · `tools` · `agent_tools` · `api_keys` · `eval_runs`.

## Security / governance (from day one)
- BYOK keys: **AES-256-GCM** encrypted with a server-side secret, validated with a 1-token ping on save, never stored raw, never logged, decrypted only inside the API route at request time.
- `agent_knowledge.permissions` scopes what each agent may recall — permission-scoping enforced on retrieval.

## Build sequence (~8 weeks, solo)
- **Phase 0** — foundation: skeleton, Supabase, auth, DB schema, BYOK vault.
- **Phase 1** — agent engine + eval harness; prove the thesis on Customer Support end-to-end. ← the heart
- **Phase 2** — clone pattern to the other 4 employees + tools (built-in AI SDK tools, user tools via MCP/HTTP).
- **Phase 3** — chat + API surface.
- **Phase 4** — polish, landing page, <2-min onboarding, ship private beta.

**Vertical first:** get Customer Support working through the entire stack before building employee #2. Spend disproportionate time on the retrieval re-ranker and the procedural playbooks — that's where "works on any LLM" actually lives.

## Explicitly out of scope (MVP)
24/7 automation workflows · multi-agent orchestration · fine-tuned per-agent models · community marketplace (design the *format* now, build the market later) · deep enterprise RBAC.
