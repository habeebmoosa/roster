# Real Usage Metrics — Overview & Workers

> Status: draft, awaiting review.

## 1. Goal

Replace the "—" placeholders across Overview, the Workers list, and the
worker detail page with real numbers wherever real data can back them —
and be explicit about the two that can't, rather than fabricating either.

## 2. Current state

| Metric | Where it shows | Real today? |
|---|---|---|
| Active employees | Dashboard | Real (`agents.length`) — semantically hollow (no pause/disable exists, so it's always "all of them"), but not fabricated. |
| Eval success rate | Dashboard | Real (`EvalRun`). |
| Conversations · 30d | Dashboard, Workers list, worker detail | `null` everywhere → renders "—". `Conversation.createdAt`/`updatedAt` already exist, indexed on `[userId, updatedAt]` — nothing computes this yet, but nothing new needs capturing either. |
| Last activity | Dashboard ("Your workers" preview), Workers list | Same — `null`, same fix as above. |
| Spend this month / Spend 30d / Tokens 30d / "Usage & cost" bars | Dashboard, Workers list, worker detail | `null` everywhere. **No underlying data exists at all.** `runAgent()` computes real `{inputTokens, outputTokens}` on every turn (`RunAgentResult.usage`) — both `server/chat/service.ts` (web chat) and `server/rest/chat-stream.ts` (REST API) receive it and then never read it. Nothing persists it anywhere. |
| "Active" status badge | Worker detail header, dashboard | Hardcoded `"Active"` string — no pause/disable concept exists on `Agent` at all. |
| Uptime | Worker detail | `null` → "—". No defined meaning — agents are stateless prompt+config invoked per-request; nothing can be "up" or "down." |

`MVP-Plan.md` originally scoped spend/convos/tokens/uptime as UI-build-phase
*fixtures* (§6.4) — but the team shipped `null`/"—" instead of fake numbers,
a deliberate, documented deviation ("never a fabricated number"). No later
phase ever closed the underlying gap.

## 3. Decisions

1. **Conversations · 30d and Last activity ship first, as a pure query fix.**
   No schema change, no new capture — just repository functions reading
   `Conversation.createdAt`/`updatedAt`, wired into the three places that
   currently hardcode `null`.
2. **Token usage gets a dedicated `UsageEvent` table, not new columns on
   `Message`.** The REST API path never creates a `Conversation`/`Message`
   at all (it's stateless per-request) — so usage from that surface can
   only be captured somewhere independent of those tables. One table,
   written from both call sites, keeps "spend this month" a single
   `SUM(costUsd) WHERE userId = ? AND createdAt >= ?` query regardless of
   which surface produced the turn.
3. **Cost is computed from `ModelCatalog` pricing, not the eval harness's
   hardcoded 3-model config.** `core/eval/runner.ts`'s cost math
   (`tokens / 1e6 × price`) is reusable as a formula, but its pricing
   source (`config/model-tiers.ts`, Anthropic-only) is the wrong one for
   general BYOK usage across every provider. `ModelCatalog` already has
   real synced pricing per `(provider, model)` — a new lookup reads from
   there instead.
4. **An unpriced model records tokens with a null cost, never a guessed
   one.** A custom/self-hosted or uncatalogued model (Ollama, a brand-new
   model the pricing sync hasn't picked up yet) has no market price to look
   up. That turn's tokens are still recorded (so "Tokens · 30d" stays
   accurate); its contribution to "Spend" is simply omitted rather than
   estimated — same "never fabricate" posture as everything else here.
5. **Usage capture is best-effort and never blocks or breaks a chat
   response.** Same resilience pattern `appendMessage`'s persistence
   already uses (wrapped in its own `.catch`, logged, never rethrown) — a
   failure to log usage is a metrics gap, not a reason to fail the turn the
   user is actually waiting on.
6. **"Active" status and "Uptime" are out of this plan.** Neither is a data
   gap — they're missing product concepts. "Active" has nothing to be
   inactive *against* (no pause/disable exists on `Agent`); "uptime" has no
   definition for a stateless, per-request agent (nothing can be down).
   Building either means designing a new feature (a real pause/disable
   toggle; some proxy for "uptime" — turn success rate? something else?),
   not wiring existing data. Flagging both for a decision before any work
   starts on them, rather than guessing.

## 4. Architecture

### 4.1 Conversations · 30d / Last activity (query-only)

New repository functions (`server/db/repositories/conversation.repository.ts`):
```ts
countConversationsSince(userId, agentId | undefined, since: Date): Promise<number>
getLastActivityByAgent(userId): Promise<Map<agentId, Date>>
```
Wired into `dashboard/page.tsx`, `workers/page.tsx`, `workers/[id]/page.tsx` —
replacing the hardcoded `null`s for these two fields only.

### 4.2 Usage capture — new table

```prisma
model UsageEvent {
  id             String   @id @default(cuid())
  userId         String
  agentId        String
  conversationId String?  // null for REST-sourced usage (no Conversation exists)
  source         String   // "chat" | "rest"
  provider       String
  model          String
  inputTokens    Int
  outputTokens   Int
  costUsd        Float?   // null when the model has no known pricing
  createdAt      DateTime @default(now())

  @@index([userId, createdAt])
  @@index([userId, agentId, createdAt])
}
```

`server/analytics/usage.ts` (new): `logUsageEvent(input)` — resolves pricing
via a new `getModelPricing(provider, model)` (reads `ModelCatalog`, returns
`null` if uncatalogued), computes `costUsd`, writes the row, swallows and
logs any failure.

Wired into:
- `server/chat/service.ts`'s `execute()` — after the stream loop, alongside
  the existing `appendMessage` call, using `result.usage` (already computed,
  currently discarded) and `source: "chat"`.
- `server/rest/chat-stream.ts`'s `streamRestChat` — same shape, `source: "rest"`,
  `conversationId: null`.

### 4.3 Aggregation + wiring

`server/analytics/usage.ts` also exports:
```ts
getSpendSince(userId, since: Date, agentId?): Promise<number>       // SUM(costUsd), skipping nulls
getTokensSince(userId, since: Date, agentId?): Promise<{input; output}>
```
Wired into the dashboard's "Spend this month" tile and "Usage & cost"
per-employee bars, the Workers list's Spend column, and the worker detail
page's `spend30dUsd`/`tokens30dLabel`.

## 5. Phased build plan

### Phase 1 — Conversations · 30d + Last activity (query-only)
- Repository functions; wire into dashboard, Workers list, worker detail.
- Immediately turns several "—"s into real numbers, zero schema risk.

### Phase 2 — Usage capture pipeline
- `UsageEvent` table + migration (checked for the pgvector-index false-positive
  before applying, as always).
- `getModelPricing()` (`ModelCatalog` lookup) + `logUsageEvent()`.
- Wire into `server/chat/service.ts` and `server/rest/chat-stream.ts`.

### Phase 3 — Spend/tokens aggregation + UI wiring
- `getSpendSince()`/`getTokensSince()`.
- Wire into dashboard ("Spend this month", "Usage & cost" bars), Workers
  list (Spend column), worker detail (`spend30dUsd`, `tokens30dLabel`).

### Phase 4 — Polish
- Full gate (typecheck/lint/unit/integration).
- Real-browser check: send a few chat turns across different providers/models
  (including one with no `ModelCatalog` entry, to confirm the null-cost path),
  confirm the dashboard/workers/detail numbers move accordingly.

## 6. Explicitly out of scope (pending your decision, not a "no")

- A real pause/disable toggle for agents (would make "Active employees" and
  the status badge mean something).
- Any definition of "Uptime" and the capture it would need.
