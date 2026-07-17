# AI Employees — MVP Plan

> **Product in one line:** Hireable, specialized AI employees (Customer Support, Content Writer, Research Analyst, Financial Analyst, Team Organizer) that perform like experts on *any* LLM the user brings — including cheap models like Gemini Flash or open-weight models.

> **The bet:** The model is a commodity. The *scaffolding around the model* — curated context, expert playbooks, structured workflows, retrieval discipline — is the product. Everything in this plan prioritizes the agent engine, because that is the only defensible moat.

---

## 1. Guiding principles

These are non-negotiable and shape every decision below.

1. **Environment over model.** Research shows open-weight models reach ~80% of frontier-model performance when wrapped in a validated, structured environment. We invest in the environment, not in picking the "best" model.
2. **Less context, not more.** Bloated context degrades every model ("lost in the middle" / "context rot"). Tight, curated, re-ranked context is what lets a weak model punch above its weight. We cap context hard.
3. **Encode *how* an expert thinks, not just *what* they know.** Procedural playbooks (decision trees, step sequences) are the differentiator, not raw knowledge dumps.
4. **Prove it on every commit.** The claim "works great on any model" is only true if an eval harness demonstrates it across model tiers on every change. The eval harness *is* the moat, made measurable.
5. **Build vertically.** One employee working end-to-end before building the other four. The first vertical slice flushes out 90% of architectural decisions.

---

## 2. Scope: what's in and what's out

### In scope (MVP)
- **5 employees:** Customer Support, Content Writer, Research Analyst, Financial Analyst, Team Organizer
- **BYOK** across 10–15 popular providers (OpenAI, Anthropic, Google, Mistral, Groq, DeepSeek, Together, Fireworks, Cohere, xAI, Perplexity, Azure, Bedrock…)
- **Two access surfaces:** streaming chat interface + REST API
- **Per-agent tools:** built-in tools + user-added tools (MCP or HTTP)
- **The agent engine:** four-layer memory, hybrid retrieval + re-ranking, structured workflows, per-agent eval harness

### Out of scope (deferred)
- 24/7 automation workflows (needs its own research phase)
- Fine-tuned per-agent LLMs (revisit once usage data justifies it)
- Multi-agent orchestration / agents calling other agents
- Marketplace for community agents (design the *format* now, build the market later)
- Fine-grained enterprise RBAC beyond basic permission scoping

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Full-stack, one language, deploys on Vercel |
| AI framework | **Vercel AI SDK** | TS-native, unified 15+ provider abstraction, first-class tools & streaming — makes BYOK nearly free |
| DB | Supabase (Postgres + `pgvector`) | Relational + vector store in one; free tier for MVP |
| Auth | Auth.js (NextAuth v5) + Google OAuth | Fast, standard |
| UI | shadcn/ui + Tailwind | Speed |
| Rate limiting | Upstash Redis | Free tier, works on Vercel |
| Deployment | Vercel | Zero-config; **move to Pro at public launch** (Hobby prohibits commercial use + has function duration limits that cut off long streams) |
| Error tracking | Sentry (free tier) | |

---

## 4. The Agent Engine (the core — spend most of your time here)

Everything else is plumbing. This section is the product.

### 4.1 Agent definition (portable spec)

Each employee is defined as a structured file (JSON/YAML), *not* hardcoded. This becomes your open-spec asset and future marketplace format.

```yaml
id: customer-support
name: "Ada — Customer Support"
role: "Customer Support Specialist"
identity: "Calm, precise, empathetic. Resolves, never deflects."
voice: "Warm but concise. Mirrors customer tone. Never robotic."
expertise:
  - de-escalation
  - policy interpretation
  - troubleshooting
abilities: [kb_lookup, draft_reply, escalate_ticket]
memory:
  semantic: ["kb://support-docs"]
  procedural: ["playbook://refund-flow", "playbook://angry-customer"]
context_budget_tokens: 8000   # hard cap
```

### 4.2 Four-layer memory (retrieved separately, assembled per query)

| Memory | Holds | Store |
|---|---|---|
| **Semantic** | Domain knowledge (docs, policies, frameworks) | `pgvector`, chunked |
| **Procedural** | Expert playbooks: *how* to solve recurring problems (decision trees, step sequences in markdown) | Structured / markdown in DB |
| **Episodic** | This user's history, past decisions, preferences | Postgres + `pgvector` |
| **Working** | Current session | Prompt window |

> **The procedural layer is where you win.** Most builders skip it. It's what makes an agent feel like an *expert* rather than a search box with a personality.

### 4.3 Retrieval pipeline (make-or-break)

```
query
  → hybrid retrieval (semantic vector search + BM25 keyword)
  → retrieve ~30–50 candidates (high recall)
  → re-ranker (cheap cross-encoder or small model) scores against query
  → keep top 3–5 only (high precision)
  → assemble into context, HARD CAP at agent's context_budget_tokens
```

- **Never dump retrieved chunks raw.** The re-ranker is the single highest-leverage component.
- Hybrid (semantic + keyword) beats either alone on recall.
- The hard cap matters *more* for weak models — they can't find the needle in a big haystack.

### 4.4 Structured workflow (not one big autonomous prompt)

Wrap each task in a decompose → execute → validate → (rollback if needed) loop. Structured plan-execute-validate workflows cut errors 60–80% vs. single-shot prompting, and this is what closes the gap on weaker models.

```
1. Decompose task into verifiable sub-steps
2. For each step: assemble minimal context → call LLM → validate output
3. If validation fails → retry / rollback to earlier step
4. Compress intermediate results before folding into next step's context
```

### 4.5 The `runAgent()` abstraction

One clean entry point everything flows through:

```ts
runAgent({
  agentId,
  messages,
  userProviderConfig,   // which provider + model, from BYOK vault
})
// internally:
//  loads agent definition (identity, voice, expertise)
//  resolves provider/model via AI SDK registry
//  runs retrieval pipeline → curated context
//  attaches agent's enabled tools
//  executes structured workflow
//  returns a stream
```

### 4.6 Eval harness (build this in Phase 1, not last)

**This is the moat, made measurable. No agent ships without passing.**

- A labeled eval set per employee (realistic tasks + expected outcomes)
- Run every change against **three model tiers**: frontier (e.g. Claude/GPT), mid (e.g. Gemini Flash), cheap/open (small open-weight)
- Track: **task success rate**, **tokens per successful task**, retrieval precision/recall, latency/cost
- Rule: a change ships only if it holds or improves success rate across *all three* tiers
- The public claim "works on a basic model" is validated here on every commit — or it isn't true

---

## 5. Data model (Supabase)

| Table | Key fields |
|---|---|
| `users` | from Auth.js |
| `provider_keys` | user_id, provider, **encrypted_key (AES-256-GCM)**, created_at |
| `agents` | id, name, role, definition (persona/voice/expertise), default_tools |
| `agent_knowledge` | agent_id, chunk, embedding (`pgvector`), source, permissions |
| `playbooks` | agent_id, name, content (markdown decision tree) |
| `conversations` / `messages` | user_id, agent_id, history |
| `tools` | name, description, JSON schema, type (builtin/mcp/http), config |
| `agent_tools` | which tools attached to which agent for which user |
| `api_keys` | hashed platform API keys for programmatic access |
| `eval_runs` | agent_id, model_tier, success_rate, tokens, timestamp |

> **BYOK key security:** encrypt with AES-256-GCM using a server-side secret before storing. Never store raw, never log, decrypt only inside the API route at request time. Validate keys with a cheap 1-token ping on save.

> **Governance note (enterprise trust):** `agent_knowledge.permissions` scopes what each agent is allowed to recall. What enters the context window matters more than the retrieval mechanism — build permission-scoping in from day one.

---

## 6. Access surfaces

### Chat interface
Streaming UI, agent switcher, conversation history, **visible tool-call steps** (e.g. "🔍 searching knowledge base…" — users love seeing the employee work), model picker scoped to the user's configured providers.

### REST API
`POST /v1/agents/{id}/chat` — authenticated by platform API key. Accepts either a reference to the user's stored provider key or a per-request key. Per-user rate limiting via Upstash.

### BYOK failure modes (handle from day one — these happen daily)
Invalid key, rate limit, insufficient quota → clean, specific errors surfaced to the user.

---

## 7. Build phases (~8 weeks, solo dev)

### Phase 0 — Foundation (Week 1)
Next.js + TS skeleton, Supabase project, Auth.js + Google OAuth, shadcn/ui, core DB schema, BYOK vault with AES-256-GCM encryption + validation ping.

### Phase 1 — Agent engine + eval harness (Weeks 2–4) ← **the heart**
- `runAgent()` abstraction
- Four-layer memory stores
- Hybrid retrieval + re-ranker + hard context cap
- Structured workflow loop (decompose → execute → validate → rollback)
- **Eval harness running across 3 model tiers** — built now, not later
- Prove the thesis on **one** employee (Customer Support) end-to-end before touching the others

### Phase 2 — The 5 employees + tools (Weeks 4–6)
- Clone the proven pattern to the other 4 employees
- Write & test each persona + expertise + **procedural playbooks**
- Built-in tools as AI SDK `tool()` functions
- User-added tools via **MCP** (preferred — "connect any MCP server to your AI employee" is a strong headline) or HTTP
- The real work here is making each agent *good* and eval-passing on all 3 tiers, not writing code

### Phase 3 — Chat + API surface (Weeks 6–7)
Streaming chat UI with tool-call visibility, agent switcher, history; REST API + platform API keys; rate limiting.

### Phase 4 — Polish + ship (Weeks 7–8)
Landing page (employees as "hire" cards), <2-min onboarding (sign in → add key → pick employee → chat), Sentry, basic analytics, feedback button. Ship as private beta.

---

## 8. Definition of done (MVP)

- [ ] 5 employees each pass their eval set across frontier / mid / cheap model tiers
- [ ] Cheap-model success rate is demonstrably close to frontier (the selling point, proven)
- [ ] BYOK works for 10–15 providers with clean error handling
- [ ] Chat + REST API both functional
- [ ] Per-agent tools (built-in + at least one user-added mechanism) working
- [ ] Onboarding to first response in under 2 minutes
- [ ] Key vault encrypted; permission-scoping enforced on retrieval

---

## 9. Sequencing reminder for a solo dev

**Go vertical first.** Get Customer Support working through the entire stack — chat → runAgent → retrieval → workflow → BYOK → response → eval — before building employee #2. Write agent definitions as files from day one so the schema stays clean and becomes your open spec later. Spend disproportionate time on the retrieval re-ranker and the procedural playbooks; that's where the "works on any LLM" magic actually lives.
