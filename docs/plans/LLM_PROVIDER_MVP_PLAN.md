# LLM Provider (BYOK) — Implementation Plan

> Status: proposed, awaiting review. Nothing in this document has been built yet.

## 1. Goal

Rebuild the BYOK provider experience end to end: a real per-provider credential
schema (not one flat `apiKey + baseUrl` form), support for **multiple
credentials per provider with a selectable default**, a best-in-class two-step
add/manage UI, real vendor logos, and a broadened provider catalog (21
providers instead of today's 9) backed by a proper model-metadata catalog.

---

## 2. Current state (as of this plan)

| Piece | File | Today |
|---|---|---|
| Provider catalog | `src/core/providers/catalog.ts` | Flat array, 9 entries. Each is just `{ kind, defaultBaseUrl, baseUrlEditable, requiresBaseUrl, suggestedModels: string[] }`. `kind` is one of `openai \| anthropic \| google \| openai-compatible`. |
| Model resolution | `src/core/providers/registry.ts` | `resolveModel()` switches on `kind` — 3 native AI SDK integrations + a generic `createOpenAICompatible` fallback for everything else. |
| Validation | `src/core/providers/complete.ts` | Generic and already correct: resolves a model, fires a 1-token `generateText`, maps failures through `ByokError`. **Does not need to change.** |
| Errors | `src/core/providers/errors.ts` | `ByokError` taxonomy: `invalid_key \| rate_limited \| insufficient_quota \| bad_base_url \| model_not_found \| unknown_provider \| embeddings_unsupported \| unknown`. |
| Data model | `prisma/schema.prisma` `ProviderKey` | `id, userId, provider, label, encryptedKey (single string), baseUrl, config (Json, unencrypted)`. **`@@unique([userId, provider])` — one credential per provider per user.** |
| Service | `src/server/providers/service.ts` | `addProviderKey` (validate → encrypt → upsert), `removeProviderKey`, `getResolveInputForUser` (looks up the single row for `(userId, provider)`). |
| API routes | `src/app/api/providers/route.ts`, `.../[provider]/route.ts` | `POST` (validate + create/overwrite), `DELETE`. **No edit/PATCH route exists.** |
| UI — add | `src/features/providers/components/add-provider-form.tsx` | One flat form: provider `<select>`, API key, free-text model with datalist, base URL if applicable. Single step. |
| UI — list | `src/features/settings/components/providers-tab.tsx` | Plain list: name + base URL + delete button. No logos, no status, no edit. |

---

## 3. Decisions (confirmed with you)

1. **GitHub Models is dropped.** Confirmed retired by GitHub on 2026-07-30 (API, catalog, everything shut down). Not added.
2. **Replicate excluded.** Its API is async predict-then-poll, not synchronous chat-completions — a different integration shape, not a form-field difference. Out of scope for this effort.
3. **Multiple credentials per provider, with a selectable default — in scope.** A user can add e.g. two OpenAI keys (personal + work) and mark one as the default. Whichever credential is used by `runAgent()`/chat/REST API/eval at any moment is **the provider's current default** — nothing about agent definitions or model selection needs to reference a specific credential id; that stays a Settings-only concern (keeps the blast radius small — see §5.2).
4. **Settings → Providers UI is provider-centric, not credential-centric.** The list shows one card per *provider* (e.g. "OpenAI"). Clicking it opens a dialog listing every credential configured for that provider, with the ability to set the default, edit, remove, or add another.
5. **Real vendor logos.** Using `@lobehub/icons` (MIT licensed, zero dependencies, purpose-built for AI/LLM provider brand marks — confirmed via its GitHub repo and npm listing). It's the right fit here the same way `lucide-react` was the right fit for general UI icons: a real, maintained, license-clean library rather than sourcing/hosting logo assets ourselves. "Custom (OpenAI-compatible)" gets a generic icon from the existing `lucide-react` set (e.g. a plug/cpu glyph) since it isn't a real vendor.
6. **Target provider list — 21 total:** OpenAI, Anthropic, Google Gemini, Google Vertex AI, Azure OpenAI, AWS Bedrock, Groq, DeepSeek, Mistral, Together AI, xAI, Cohere, Perplexity, Fireworks AI, Cerebras, DeepInfra, NVIDIA NIM, OpenRouter, Hugging Face, Ollama, Custom (OpenAI-compatible).

---

## 4. Research findings that shape the design

**Credential shapes vary far more than `apiKey + baseUrl`:**

| Provider | Real fields needed | AI SDK package |
|---|---|---|
| Azure OpenAI | resource name (or base URL), API key *or* Entra ID token, API version, deployment name (used as the model id) | `@ai-sdk/azure` |
| AWS Bedrock | access key id + secret access key + optional session token (SigV4-signed) *or* a Bedrock bearer key, plus **region** (required) | `@ai-sdk/amazon-bedrock` |
| Google Vertex AI | service-account JSON (`client_email` + `private_key`) *or* ADC, plus **project id** + **location** | `@ai-sdk/google-vertex` (Node and `/edge` subpaths — JWT signing needs Node crypto) |
| Hugging Face | bearer token — but it must carry the "Make calls to Inference Providers" permission scope, or requests silently fail | `@ai-sdk/huggingface` |
| Ollama | **no key at all** — just a base URL (local, default `http://localhost:11434/v1`) | none — `createOpenAICompatible` |
| Cohere, Perplexity, Fireworks, Cerebras, DeepInfra | plain bearer key, optional base URL override | `@ai-sdk/{cohere,perplexity,fireworks,cerebras,deepinfra}` (all first-party, confirmed current) |
| NVIDIA NIM, OpenRouter | plain bearer key; genuinely OpenAI-compatible endpoints | no first-party AI SDK package — `createOpenAICompatible` (OpenRouter also has a maintained community package, `@openrouter/ai-sdk-provider`, worth using instead for its native reasoning/tool-call handling) |

Full per-provider field lists, base URLs, and quirks (e.g. Cerebras' 8K free-tier context cap, Fireworks' `accounts/fireworks/models/...` id prefix, DeepInfra's `/v1/openai` path segment) are captured in §7's catalog entries.

**This confirms the core architectural gap:** the catalog needs a genuine per-provider field schema, not a fixed 3-field form — and credential storage needs to support more than one secret string per credential (Bedrock needs up to 3; Vertex needs a JSON blob).

---

## 5. Architecture changes

### 5.1 Data model (real migration required this time)

```prisma
model ProviderKey {
  id           String   @id @default(cuid())
  userId       String
  provider     String
  label        String   // user-assigned name, e.g. "Personal", "Work", "Prod Azure" — now required
  isDefault    Boolean  @default(false)
  encryptedKey String   // JSON-encoded credential bundle for multi-secret providers, a bare key otherwise — still one encrypted column
  baseUrl      String?
  config       Json     @default("{}") // non-secret structured fields: region, project, location, deployment, apiVersion, resourceName, headers
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider, label]) // replaces today's @@unique([userId, provider])
  @@index([userId, provider])
  @@map("provider_keys")
}
```

- **Migration backfill:** existing rows (one per user/provider today) get `label = "Default"` and `isDefault = true`.
- **Secret bundling:** `encryptedKey` keeps holding one encrypted string, but for multi-secret providers (Bedrock, Vertex) that string is an encrypted JSON object (e.g. `{ accessKeyId, secretAccessKey, sessionToken }`). Non-secret structured fields (region, project, deployment, api version) live in the existing unencrypted `config` column — no new column needed there, it already exists for exactly this.
- **Default enforcement is application-level, not a DB constraint:** setting a credential as default runs in a transaction that unsets `isDefault` on every other row for that `(userId, provider)` first. Simpler and DB-agnostic (keeps the "any Postgres" philosophy — no partial-unique-index raw SQL).
- **Deleting the default credential** when others remain: auto-promote the most-recently-created remaining one to default (deterministic, no extra prompt — same pattern as e.g. Stripe's default-payment-method reassignment). Deleting the last credential leaves the provider unconfigured, same as today.

### 5.2 Repository / service layer

New/changed functions in `provider-key.repository.ts` + `server/providers/service.ts`:
- `listCredentialsForProvider(userId, provider)` — all credentials for one provider (for the manage dialog).
- `getDefaultCredential(userId, provider)` — replaces today's single-row lookup; used by `getResolveInputForUser`/`getModelForUser`.
- `createCredential(...)` — first credential for a provider is auto-defaulted; subsequent ones default to non-default unless the user explicitly sets it.
- `setDefaultCredential(userId, provider, credentialId)` — the transactional swap described above.
- `updateCredential(credentialId, ...)` — powers edit; if no new secret is supplied, decrypts and re-encrypts the existing one unchanged (so editing just a label or region doesn't force re-entering the key) and still re-validates against the (possibly changed) config.
- `deleteCredential(credentialId)` — with the default-promotion rule above.

**Crucially, nothing about `runAgent()`, the REST API, the eval harness, or agent definitions changes.** They still resolve a model from `(provider, model)` alone; `getResolveInputForUser` transparently resolves to that provider's *current default* credential. Explicit per-agent credential pinning (e.g. "always use my 'Work' OpenAI key for this employee") is a plausible future phase but is **not** in this plan — flagging it now so it's a deliberate deferral, not an oversight.

### 5.3 Provider catalog schema

```ts
interface ProviderField {
  key: string;                 // e.g. "region", "resourceName", "deployment"
  label: string;                // form label
  kind: "secret" | "text" | "select";
  required: boolean;
  placeholder?: string;
  helpText?: string;            // e.g. HF's permission-scope warning
  options?: string[];           // for kind: "select"
}

interface ProviderCatalogEntry {
  id: string;
  label: string;
  kind: /* existing */ "openai" | "anthropic" | "google"
      | /* new */ "google-vertex" | "azure" | "amazon-bedrock"
      | "cohere" | "perplexity" | "fireworks" | "cerebras" | "deepinfra"
      | "huggingface" | "openrouter" | "openai-compatible";
  requiresApiKey: boolean;      // false only for Ollama
  fields: ProviderField[];      // everything beyond the base secret(s)
  defaultBaseUrl?: string;
  baseUrlEditable: boolean;
  requiresBaseUrl: boolean;
  docsUrl?: string;             // "Get your API key →"
  suggestedModels: string[];    // superseded by the model catalog (Phase 5) but kept as an immediate fallback
  embeddingModel?: string;
}
```

`fields` with `kind: "secret"` get bundled into the encrypted JSON blob; everything else lands in the plain `config` column.

### 5.4 UI shape

- **Settings → Providers tab:** a grid/list of *provider* cards — `@lobehub/icons` logo, provider name, a summary line ("2 credentials · default: Work"), a status indicator. Click → opens the manage dialog. A separate **"+ Add provider"** button starts the top-level flow for a provider with zero credentials yet.
- **"Add provider" dialog** (reuses the large `Modal size="panel"` built for the connector redesign):
  - **Step 1:** searchable, categorized grid of provider logos ("Frontier", "Fast & open-weight", "Aggregators", "Enterprise/cloud", "Self-hosted").
  - **Step 2:** the selected provider's `fields` rendered dynamically (secrets as password inputs, everything else as labeled text/select with help text), then "Validate & add" (same 1-token ping). If the chosen provider already has credentials, step 2 is just "add another credential" — same form, no special-casing.
- **"Manage {Provider} credentials" dialog:** a list of credential rows (label, non-secret identifying info — region/deployment/base URL, **never any part of the actual secret**, consistent with the existing "never stored raw, never logged" posture), a default radio/badge per row, Edit and Remove per row, "+ Add credential" at the bottom (same step-2 form).
- **Edit:** step-2 form pre-filled with the stored non-secret fields; secret inputs render blank with "leave blank to keep the current credential."

---

## 6. Phased build plan

### Phase 1 — Multi-credential data model + repository/service layer
- The `ProviderKey` migration in §5.1 (real schema change this time, with backfill).
- New repository functions (§5.2) and the transactional default-swap/delete-promotion logic.
- `getResolveInputForUser` switched to default-credential lookup. Every existing caller (`runAgent`, REST API, eval harness, playground) needs zero changes.
- Tests: default auto-assignment on first credential, default swap, delete-promotes-next-default, delete-last-leaves-unconfigured.

### Phase 2 — Registry support for new provider `kind`s
- Extend `resolveModel()` with one case per new kind, each pulling its secret bundle + `config` fields into the right AI SDK factory (`createAzure`, `createAmazonBedrock`, `createGoogleVertex`, `createCohere`, `createPerplexity`, `createFireworks`, `createCerebras`, `createDeepinfra`, `createHuggingFace`, plus `@openrouter/ai-sdk-provider` for OpenRouter).
- Extend `ByokError` with a `missing_required_field` code for pre-flight structural failures (missing region/project) so those fail clean before ever hitting the network.
- Prove the extension with 2–3 simple bearer-key providers first (Cohere, Perplexity) before the multi-field ones.

### Phase 3 — Provider catalog field schemas + real logos
- Add `@lobehub/icons` (confirm exact package — likely `@lobehub/icons-static-svg` for a dependency-free subset — and license terms at install time).
- Write the full `ProviderField[]` schema for all 21 providers per §7 below.
- Generic icon for "Custom" from the existing `lucide-react` set.

### Phase 4 — New Settings UI
- Provider-card list (replacing today's credential-row list).
- "Add provider" two-step dialog (Modal `size="panel"`, matching the connector-dialog architecture).
- "Manage credentials" dialog: list + set-default + edit + remove + add-another.
- New `PATCH /api/providers/[provider]/[credentialId]` route (edit) alongside existing POST/DELETE, updated to operate by credential id where relevant.

### Phase 5 — Model catalog ("all model details")
- `ModelCatalog` table (`provider, modelId, contextWindow, maxOutputTokens, inputModalities, outputModalities, reasoningSupport, toolSupport, structuredOutputSupport, inputPrice, outputPrice, source, lastSyncedAt`), populated by a nightly sync from `models.dev/api.json` (per the earlier research in this project — the single best cross-provider metadata source: pricing, context window, modalities, reasoning/tool support, 75+ providers, free public API).
- Manual-override path for what the catalog can't cover — critically, **Ollama**, whose models are whatever the user has pulled locally: introspect via the user's own Ollama instance (`GET /api/tags`) rather than an external catalog.
- Replace the free-text `suggestedModels` datalist (add-provider form, hire wizard, playground) with a real searchable model picker scoped to the connected provider, showing context window + price.

### Phase 6 — Roll out the remaining providers
- Batch order, easiest first: Fireworks, Cerebras, DeepInfra, NVIDIA NIM, OpenRouter, Hugging Face (all simple bearer-key) → Azure, Bedrock, Vertex (multi-field, higher risk) → Ollama last (its "no key" UX is the one real outlier, worth handling once everything else is proven stable).
- Each addition: catalog entry + registry case + a validation smoke test.

### Phase 7 — Polish
- Docs links per provider ("Get your API key →").
- Inline help text for the known gotchas (HF scope requirement, Cerebras' 8K free-tier cap, Bedrock's region requirement, Azure's "deployment name is the model id" point).
- End-to-end check across at least one provider per credential shape (simple bearer, multi-secret signed, service-account) before calling this done.

---

## 7. Per-provider field reference (for Phase 3)

| Provider | Secret field(s) | Config field(s) | Notes |
|---|---|---|---|
| OpenAI | apiKey | — | base URL optional override |
| Anthropic | apiKey | — | base URL optional override |
| Google Gemini | apiKey | — | base URL optional override |
| Google Vertex AI | service-account JSON (`clientEmail`, `privateKey`) | `project` (required), `location` (required) | Node/Edge split in the SDK package itself |
| Azure OpenAI | apiKey (or Entra token — v2) | `resourceName` or `baseUrl`, `apiVersion`, `deployment` (used as model id) | |
| AWS Bedrock | `accessKeyId`, `secretAccessKey`, `sessionToken` (optional) — or a Bedrock bearer key | `region` (required) | SigV4-signed under the hood |
| Groq | apiKey | — | fixed base URL, `createOpenAICompatible` |
| DeepSeek | apiKey | — | fixed base URL, `createOpenAICompatible` |
| Mistral | apiKey | — | fixed base URL, `createOpenAICompatible` |
| Together AI | apiKey | — | fixed base URL, `createOpenAICompatible` |
| xAI | apiKey | — | fixed base URL, `createOpenAICompatible` |
| Cohere | apiKey | — | `@ai-sdk/cohere` |
| Perplexity | apiKey | — | `@ai-sdk/perplexity` |
| Fireworks AI | apiKey | — | `@ai-sdk/fireworks`; model ids need the `accounts/fireworks/models/...` prefix |
| Cerebras | apiKey | — | `@ai-sdk/cerebras`; free tier hard-caps context at 8K — surfaced as help text |
| DeepInfra | apiKey | — | `@ai-sdk/deepinfra`; base URL has a `/v1/openai` path segment |
| NVIDIA NIM | apiKey | — | `createOpenAICompatible`, base URL `https://integrate.api.nvidia.com/v1` |
| OpenRouter | apiKey | optional `HTTP-Referer`/`X-Title` headers | `@openrouter/ai-sdk-provider` |
| Hugging Face | apiKey (needs "Inference Providers" scope) | — | `@ai-sdk/huggingface`; scope requirement flagged in help text |
| Ollama | none (`requiresApiKey: false`) | `baseUrl` (required, default `http://localhost:11434/v1`) | models introspected live from the user's instance, not the catalog |
| Custom | apiKey | `baseUrl` (required) | generic icon |

---

## 8. Open items still worth a decision

1. `encryptedKey` column name now holds a JSON blob for multi-secret providers — keep the name (least churn) or rename to `encryptedCredential` for clarity? Purely cosmetic, bundled into the Phase 1 migration either way.
2. Per-agent credential pinning (choosing a *specific* credential, not just "the provider's default") is explicitly deferred — confirm that's fine for now.
3. Exact `@lobehub/icons` sub-package to depend on (`@lobehub/icons` full React set vs. the leaner `@lobehub/icons-static-svg`) — a Phase 3 implementation detail, not a scope question.
