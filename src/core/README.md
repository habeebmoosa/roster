# `core/` — the agent engine (the product)

Framework-agnostic domain logic. **`core/` must never import from `app/` or any
Next.js API** — the dependency rule points inward. This keeps the engine
portable and reusable from the REST API, the eval harness, and future
automation runners.

Built out across Phases 4–7:

- `agent/` — agent-definition loader/validator + `runAgent()` entry point
- `providers/` — AI SDK registry, provider/model resolution (BYOK)
- `memory/` — semantic · procedural · episodic · working
- `retrieval/` — hybrid search, re-ranker, context assembler + hard cap
- `workflow/` — decompose → execute → validate → rollback
- `tools/` — built-in tools + MCP/HTTP adapters
- `eval/` — eval harness (runner, scorers, model tiers)
