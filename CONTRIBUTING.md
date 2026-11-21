# Contributing to Roster

Thanks for helping! Roster's thesis is that **the engineering around the model is the
product**, so the most valuable contributions improve the _environment_: playbooks,
retrieval, workflow, evals, tools and connectors.

## Getting set up

Prerequisites: Node 22+ and Docker (or any Postgres with `pgvector`).

```bash
npm install
cp .env.example .env     # set AUTH_SECRET, ENCRYPTION_KEY, one sign-in provider
npm run db:up            # Postgres 16 + pgvector on port 5434
npm run db:migrate
npm run db:seed          # agents + connector directory
npm run dev              # http://localhost:3005
```

See [docs/self-hosting.md](docs/self-hosting.md) for the full-stack Docker option.

## Before you open a PR

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration   # needs the DB running
```

Format with `npm run format`. Use [conventional commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `docs:` …).

## Architecture rules

- **`core/` and `agents/` stay framework-agnostic.** `core/` must never import from
  `app/` or Next.js — it is the portable engine.
- **Repository pattern.** Prisma is only used behind `src/server/db/repositories/`.
- **Validate every boundary with Zod** (env, API input, agent definitions). No `any`.
- **Secrets discipline.** Never log provider keys or credentials; decrypt only inside
  the request that needs them.
- **UI:** Tailwind only, built from `src/ui/` primitives. No component libraries.
- **Config over code.** Agents, providers and connectors are data, not branches.

Read [CLAUDE.md](CLAUDE.md) for a quick tour and [docs/MVP-Plan.md](docs/MVP-Plan.md)
for the design rationale.

## Changing engine behavior

Changes to prompts, retrieval, re-ranking, playbooks or the workflow must be measured:
run `npm run eval` across the frontier, mid and cheap tiers (bring your own
`EVAL_*_API_KEY`s — see `.env.example`). A change should hold or improve success rate
on **all** tiers; say what you ran in the PR. Maintainers can run it for you if you
don't have keys.

## Good first contributions

- A new curated MCP connector: add `mcp-servers/<id>.json` (see its README).
- A new built-in tool in `src/core/tools/` (local, no network) with tests.
- Improving a playbook or adding eval cases for an existing employee.
- A new employee following [docs/agent-spec.md](docs/agent-spec.md).

## Licensing

By contributing you agree your contribution is licensed under the
[Apache License 2.0](LICENSE).
