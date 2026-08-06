# Thinking Toggle + Multi-Step Workflow Visibility

> Status: draft, awaiting review.

## 1. Goal

Two of `CHAT_STREAMING_UX_PLAN.md`'s explicitly-out-of-scope items, now in scope:

1. A user-facing toggle to turn reasoning on/off per turn, instead of it being
   silently always-on for every model `resolveReasoningOptions` recognizes.
2. Reasoning + tool-call visibility on the multi-step workflow path (today
   only the single-step "bypass" path gets it).

## 2. Current state

| Piece | File | Today |
|---|---|---|
| Reasoning gate | `core/providers/reasoning.ts` | `resolveReasoningOptions(providerId, modelId)` — always on for an allowlisted model, no way to opt out, no client visibility into whether the current model even qualifies. |
| Bypass path | `core/agent/run-agent.ts` | Gets `providerOptions` and exposes `fullStream` — reasoning/tool-calls already visible (`CHAT_STREAMING_UX_PLAN.md`, shipped). |
| Workflow path | `core/workflow/executor.ts` → `executeStep()` | Calls `generateText()`, returns only `{step, output, retrievedSourceUris, retrievedContext, usage}` — `result.toolCalls`/`result.toolResults`/`result.reasoningText` are discarded, exactly like the bypass path used to discard them before the prior plan. Never receives `providerOptions` at all, so reasoning can't even be requested here yet. |
| Step retry/rollback | `core/workflow/retry.ts` | `runStepWithRetry()` (up to 2 attempts) and `rollbackToSingleStep()` (one whole-task re-attempt) both call `executeStep()` — extending its result shape covers both for free. |
| Step events | `core/workflow/orchestrate.ts` | `WorkflowStepEvent` = `step-start \| step-complete \| rollback` only — plan-decomposition boundaries, never a tool call or reasoning segment. |
| Event → wire | `server/chat/service.ts` | `onStepEvent` pushes every event into `stepEvents[]` and writes it as a `data-stepEvent` chunk — consumed only by `StepEventsList`/`deriveStepRows` (the "Step 1 / Step 2" progress list), a separate rendering path from `MessagePart`/`ChatThread`. |
| Chat composer | `features/chat/components/chat-composer.tsx` | Provider/model picker only; no reasoning control, no per-turn state for it. |

## 3. Decisions

1. **Per-turn toggle, not a persisted preference.** Matches how provider/model
   selection already works (`chat.tsx`'s `provider`/`model` state — picked
   fresh each session, never saved to the agent). A `thinkingEnabled` boolean
   travels with each `/api/chat` request, same as `provider`/`model` do
   today. No schema change.
2. **A binary on/off switch, not an effort selector.** Matches what was
   asked. `resolveReasoningOptions` gains an `enabled` parameter: `false` (or
   omitted) → always `undefined`, regardless of model; `true` → the existing
   allowlist check runs as before. An effort selector (low/medium/high) is a
   reasonable future addition, not built here.
3. **Defaults to off.** Reasoning has a real cost/latency tradeoff (extra
   billed tokens, slower first-token time) — opt-in matches how Claude.ai and
   ChatGPT gate "extended thinking" behind an explicit control rather than
   silently taxing every capable-model turn. (Flagging this as the one
   genuine judgment call in this plan — easy to flip if you'd rather default
   it on.)
4. **The toggle only appears for a model that actually qualifies.** A new
   `supportsReasoning(providerId, modelId): boolean` (the allowlist check,
   extracted so both `resolveReasoningOptions` and the client UI share it) —
   pure, framework-agnostic, safe to import client-side exactly like
   `MessagePartsAccumulator` already is. `ChatComposer` hides the switch
   entirely rather than showing a control that would do nothing for e.g.
   `gpt-4o-mini` or any BYOK open-weight model.
5. **Workflow visibility is per-step, not per-token.** `executeStep()` calls
   `generateText()` (not `streamText`), so a step's reasoning/tool-calls are
   only known once that whole step finishes — never revealed incrementally
   within a step the way the bypass path's live tokens are. What *does*
   happen live: each step's reasoning/tool-calls appear on the wire the
   moment that step completes, progressively across the multi-step turn —
   the same "live-across-steps, resolved-within-a-step" shape the existing
   `data-stepEvent` progress list already has today.
6. **Only the winning attempt's reasoning/tool-calls are shown.** A step that
   fails validation and retries (`runStepWithRetry`, max 1 retry) or falls
   back to rollback (`rollbackToSingleStep`) would otherwise surface a
   confusing "tried, failed, tried again" trail. Only the attempt that
   actually passed validation (or the rollback's own attempt) is surfaced —
   matches how `stepOutputs` already only ever records the winning output.
7. **New step events are converted into the exact same `UIMessageChunk`
   vocabulary the bypass path already produces** (`reasoning-start/delta/end`,
   `tool-input-start/available`, `tool-output-available/error`), fed through
   the same `MessagePartsAccumulator`. Zero client-side changes — `ChatThread`,
   `ReasoningBlock`, and `ToolCallChip` already render these; they have no
   way to tell (and don't need to) which server path produced them.
8. **MCP tool attribution needs no new plumbing.** `executeStep()`'s tools are
   the same merged built-in+MCP `ToolSet` the bypass path uses, built by
   `wrapMcpToolsForAgent` with `tool({ metadata })` already attached — so
   `generateText()`'s `result.toolCalls`/`result.toolResults` already carry
   `toolMetadata` (source/serverId/serverName) automatically, the same
   propagation mechanism the bypass path relies on.

## 4. Architecture

### 4.1 Thinking toggle — full stack

- `core/providers/reasoning.ts`: extract `supportsReasoning(providerId, modelId): boolean`
  (the allowlist check); `resolveReasoningOptions(providerId, modelId, enabled: boolean)`
  short-circuits to `undefined` when `!enabled`.
- `server/agents/service.ts`: `StreamAgentChatInput` gains `thinkingEnabled?: boolean`;
  `resolveReasoningOptions(input.provider, input.model, input.thinkingEnabled ?? false)`.
- `server/chat/service.ts`: `SendChatMessageInput` gains `thinkingEnabled?: boolean`, passed through.
- `app/api/chat/route.ts`: `bodySchema` gains `thinkingEnabled: z.boolean().optional()`.
- `use-chat-stream.ts`: `send()`/the hook's options carry `thinkingEnabled`, included in the POST body.
- `chat.tsx`: new `thinkingEnabled` state (default `false`), passed to `ChatComposer` and to `send()`.
- `chat-composer.tsx`: a `Switch` + "Thinking" label near the model picker,
  rendered only when `supportsReasoning(provider, model)` — disabled while `running`.

### 4.2 Workflow visibility — core/workflow

- `ExecuteStepInput`/`RunStepInput`/`RollbackInput`/`RunWorkflowInput` each
  gain `providerOptions?: ProviderOptions` (same derived type `run-agent.ts`
  already defines), threaded down to every `generateText()` call.
- `StepExecutionResult` gains:
  ```ts
  toolCalls: TypedToolCall<ToolSet>[];
  toolResults: TypedToolResult<ToolSet>[];
  reasoningText?: string;
  ```
  (straight off `generateText()`'s own result object — no new derivation logic).
- `WorkflowStepEvent` gains:
  ```ts
  | { type: "step-reasoning"; index: number; text: string }
  | {
      type: "step-tool-call";
      index: number;
      toolCallId: string;
      toolName: string;
      source: "mcp" | "builtin";
      connectorName?: string;
      input: unknown;
      output?: unknown;
      isError?: boolean;
    }
  ```
- `runWorkflow()`: right after `runStepWithRetry()` (or `rollbackToSingleStep()`)
  resolves for a step, emit one `step-reasoning` event (if `reasoningText` is
  non-empty) and one `step-tool-call` event per tool call, derived from
  `run.result.toolCalls`/`toolResults`/`reasoningText` — same place the
  existing `step-complete` event already fires from.
- `core/agent/run-agent.ts`: pass `providerOptions` into the `runWorkflow()`
  call too (today only the bypass `streamText()` call gets it).

### 4.3 Workflow visibility — server/chat/service.ts wiring

`onStepEvent` branches:
- `step-start` / `step-complete` / `rollback` — unchanged.
- `step-reasoning` — synthesize `reasoning-start` (id `step-${index}-reasoning`) →
  `reasoning-delta` (the whole text as one delta) → `reasoning-end`; `writer.write()`
  and `accumulator.apply()` each.
- `step-tool-call` — synthesize `tool-input-start` (with `toolMetadata` built
  from `source`/`connectorName`) → `tool-input-available` → `tool-output-available`
  (or `tool-output-error` if `isError`); same write + accumulate treatment.

The workflow branch of `execute()` (today: plain `textStream` loop, no
accumulator at all) gains its own `MessagePartsAccumulator`, fed by both
these synthesized chunks and the step's own final `text-start/delta/end`
chunks — so a workflow-path turn ends up with a real, ordered `parts[]`
(reasoning → tool-call → text, per step) instead of today's single wrapped
text part.

## 5. Phased build plan

### Phase 1 — Thinking toggle (full stack)
- `supportsReasoning()` + `resolveReasoningOptions(..., enabled)`.
- Route/service/hook plumbing for `thinkingEnabled`.
- `ChatComposer` switch, gated on `supportsReasoning`.

### Phase 2 — Workflow visibility: core/workflow mechanics
- `providerOptions` threading through executor/retry/orchestrate.
- `StepExecutionResult`'s new fields; `WorkflowStepEvent`'s two new variants;
  `runWorkflow()` emitting them for the winning attempt only.

### Phase 3 — Workflow visibility: service.ts wiring
- `onStepEvent`'s new branches; the workflow path's own `MessagePartsAccumulator`;
  persisting the resulting `parts[]`.

### Phase 4 — Polish
- Full gate (typecheck/lint/unit/integration).
- Real-browser check: a reasoning-capable model, a prompt that both trips
  multi-step decomposition and needs a tool call, toggle on and off.

## 6. Explicitly out of scope

- An effort-level selector (low/medium/high) for the thinking toggle.
- Persisting the toggle as a per-agent or per-user default.
- True per-token live streaming *within* a single workflow step (would
  require re-architecting step validation/compression to work against a
  partial stream — a much larger change than this plan's scope).
- Surfacing failed retry attempts' reasoning/tool-calls (only the winning
  attempt is shown).
