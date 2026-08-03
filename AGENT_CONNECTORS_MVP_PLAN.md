# Agent ↔ Connector Assignment — Implementation Plan

> Status: approved, ready to build. Phase 1 starts next.

## 1. Goal

Let a user choose which of their connected MCP servers (Connectors) a given
AI employee may actually use — both when hiring a new employee, and
afterward from a "Connectors" tab on the employee's detail page. Enabling a
connector for an employee should immediately, actually change which tools
that employee has available in chat and via the REST API — not just record a
preference.

---

## 2. Current state (as of this plan)

This is the unusual, good case: **the entire backend already exists,
already works, and is already tested — nothing in this section needs to be
built.** What's missing is only the two UI surfaces and the routes that
connect them to this existing machinery.

| Piece | File | Today |
|---|---|---|
| Data model | `prisma/schema.prisma` → `AgentMcpServer` | Real join table: `(userId, agentId, mcpServerId)`, `@@unique`, cascade deletes on all three FKs. Already migrated. |
| Repository | `src/server/db/repositories/agent-mcp-server.repository.ts` | `listEnabledMcpServerIds`, `enableMcpServerForAgent`, `disableMcpServerForAgent`. Complete, but has **no dedicated test file** — only exercised indirectly today. |
| Runtime resolution | `src/server/mcp/agent-tools-service.ts` → `resolveMcpToolsForAgent(userId, agentId)` | Already gates on "connected **and** enabled for this agent." Degrades gracefully per-server (a broken connector doesn't fail the whole turn). |
| Tool composition | `src/server/agents/service.ts` → `resolveToolsForAgent` | Already merges built-in tools (`abilities`) with `resolveMcpToolsForAgent`'s output, for **every** chat turn. |
| Surfacing | Chat UI + `POST /v1/agents/{id}/chat` | Both funnel through the identical `streamAgentChat()` → `resolveToolsForAgent()` path. No divergence, no REST-specific bypass. |
| Proof it works | `tests/integration/agent-mcp-tools.test.ts` | Drives enable → connect → real MCP tool call against a mock server today. |
| Connect layer | `src/server/mcp/connect-service.ts`, `/connectors` UI | Full OAuth 2.1 DCR + static-header connect flow, `listMcpServersForUser(userId)` → `{ ...server, connected, connectionStatus }`. Purely user↔server, no agent concept. |
| Missing | — | **No API route anywhere calls `enableMcpServerForAgent`/`disableMcpServerForAgent`.** No UI (hire wizard or worker detail) lets a user toggle them. `MVP-Plan.md` claims this shipped in Phase 10 — it didn't; that doc is stale on this point and gets corrected in Phase 4. |

---

## 3. Decisions

1. **Only *connected* servers are selectable.** Both pickers list the user's
   already-connected servers only (`listMcpServersForUser(...).filter(c =>
   c.connected)`) — enabling an unconnected server would do nothing at
   runtime anyway, since `resolveMcpToolsForAgent` requires an active
   connection too. Each surface links out to `/connectors` for the user to
   add more.
2. **Reuse the existing toggle-list pattern exactly.** `step-abilities.tsx`
   (label + description + `<Switch>` per row) is the template for both new
   pickers — no new list/multi-select component gets invented.
3. **API shape: two routes, no bulk endpoint.**
   `POST /api/agents/[id]/connectors/[serverId]` (enable) and
   `DELETE /api/agents/[id]/connectors/[serverId]` (disable), mirroring the
   existing model-tab/credential-default route conventions. The hire wizard
   collects selections locally (no network calls mid-wizard, the agent
   doesn't exist yet) and fires these same two endpoints once, right after
   the new agent is created.
4. **No embedded OAuth-connect flow in the hire wizard.** Connecting a new
   server needs a full-page redirect (OAuth 2.1 DCR). If a user wants one
   mid-wizard, the step links out to `/connectors`; the wizard's existing
   "Save & exit" session-draft already covers resuming afterward. Building a
   real embedded connect flow is out of scope — disproportionate for what's
   being asked.
5. **No "too many tools" warning, no bulk/PATCH endpoint.** Neither was
   asked for; both add complexity for a need that doesn't exist yet.

---

## 4. Architecture

### 4.1 New service function

`src/server/mcp/connect-service.ts` gains:

```ts
export interface AgentConnectorOption extends McpServerListItem {
  enabled: boolean;
}

export async function listAgentConnectors(
  userId: string,
  agentId: string,
): Promise<AgentConnectorOption[]> {
  const [servers, enabledIds] = await Promise.all([
    listMcpServersForUser(userId),
    listEnabledMcpServerIds(userId, agentId),
  ]);
  const enabledSet = new Set(enabledIds);
  return servers
    .filter((s) => s.connected)
    .map((s) => ({ ...s, enabled: enabledSet.has(s.id) }));
}
```

Single source both surfaces call server-side (matches how `providerKeys` is
already fetched server-side and passed down as a prop — no client-side GET
route needed for either surface).

### 4.2 New routes

`src/app/api/agents/[id]/connectors/[serverId]/route.ts`:

- `POST` — auth check → confirm the agent exists (`getAgentDefinition`) →
  confirm the server is connected for this user (400 `connector_not_connected`
  otherwise, same shape as the model route's `provider_not_connected`) →
  `enableMcpServerForAgent(userId, agentId, serverId)`.
- `DELETE` — auth check → `disableMcpServerForAgent(userId, agentId,
  serverId)` (safe no-op if it wasn't enabled).

### 4.3 Worker detail page — "Connectors" tab

- 4th `TabsTrigger`/`TabsPanel` on `workers/[id]/page.tsx`, server-fetching
  `listAgentConnectors(userId, id)`.
- `DetailConnectorsTab` (client): toggle-switch list — name, description,
  trust badge (reusing `ConnectorCard`'s `TRUST_BADGE` mapping). Each toggle
  fires the Phase 1 route immediately, then `toast()` + `router.refresh()` —
  identical UX shape to `DetailModelTab`.
- Empty state ("No connectors connected yet" → link to `/connectors`) when
  the user has none connected, matching the existing empty-state convention.

### 4.4 Hire wizard — "Connectors" step

- Inserted as step 5: Role → Basics → Knowledge → Abilities → **Connectors**
  → Model → Review. `STEP_COUNT` 6 → 7.
- `HireFormState.connectorIds: string[]` + `toggleConnector()` in
  `use-hire-wizard.ts`, same shape as `abilities`/`toggleAbility`.
- `/hire/page.tsx` fetches the user's connected servers server-side (same
  pattern as `providerKeys`) and passes them into `HireWizard`.
- `submit()`: after `POST /api/agents` succeeds, fire the enable route for
  each selected connector id in parallel, best-effort — a connector failing
  to enable must not undo a successfully-created employee; surface a soft
  warning toast if any fail, but still navigate to `/chat?agentId=...`.

---

## 5. Phased build plan

### Phase 1 — API layer (no UI yet, independently testable)
- `listAgentConnectors` in `connect-service.ts`.
- `POST`/`DELETE` routes under `src/app/api/agents/[id]/connectors/[serverId]/`.
- New direct test file for `agent-mcp-server.repository.ts` (doesn't exist
  today) + route tests for both verbs.

### Phase 2 — Worker detail page: "Connectors" tab
- Proves the API layer end-to-end on the simpler of the two surfaces first,
  and immediately benefits all 5 existing employees, not just newly-hired
  ones.

### Phase 3 — Hire wizard: "Connectors" step
- New step, wizard state, and the post-creation enable-call sequence in
  `submit()`.

### Phase 4 — Polish
- Trust-tier disclaimer text (community/custom) reused from
  `connector-detail-dialog.tsx` in both pickers.
- Real-browser visual/manual pass on both surfaces.
- Correct `MVP-Plan.md`'s inaccurate "real since Phase 10" claim to reflect
  what's actually shipped as of this plan.

---

## 6. Explicitly out of scope

- An embedded OAuth-connect flow inside the hire wizard.
- A "too many tools enabled" warning or any context-budget-aware limiting.
- A bulk-set/PATCH endpoint for connectors (two single-server verbs are
  sufficient at this scale).
