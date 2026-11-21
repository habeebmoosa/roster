# Agent definition spec

Every Roster employee is a portable definition under `agents/<id>/`. Nothing about
an employee is hardcoded — this folder is the whole product surface for a role, and
the format intended for sharing employees between instances.

```
agents/<id>/
  agent.yaml        identity, voice, expertise, abilities, memory pointers, budget
  playbooks/*.md    procedural know-how: how an expert decides and acts
  knowledge/*.md    reference documents, chunked + embedded for retrieval
```

## `agent.yaml`

Validated by Zod in [`src/core/agent/definition.ts`](../src/core/agent/definition.ts).

| Field                   | Type                | Notes                                                                                  |
| ----------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| `id`                    | string              | kebab-case, unique. Must match the folder name.                                        |
| `name`                  | string              | Display name, e.g. `Ada — Customer Support`.                                           |
| `role`                  | string              | One-line job title.                                                                    |
| `identity`              | string              | Who the employee is: temperament and how they approach work.                           |
| `voice`                 | string              | How they write: tone, length, things to avoid.                                         |
| `expertise`             | string[]            | Skills, used in the system prompt.                                                     |
| `abilities`             | string[]            | Built-in tool ids to enable (see below). Unknown ids are descriptive-only and ignored. |
| `memory.semantic`       | string[]            | Knowledge sources, e.g. `kb://support-docs`.                                           |
| `memory.procedural`     | string[]            | Playbooks, e.g. `playbook://refund-flow`.                                              |
| `context_budget_tokens` | int                 | **Hard cap** on retrieved context assembled per query. Default 8000.                   |
| `model`                 | `{provider, model}` | Optional default model; users can still pick one per request.                          |

Built-in tool ids: `convert_pdf_to_text`, `convert_docx_to_text`,
`convert_markdown_to_html`, `convert_html_to_markdown`, `calculate`,
`count_text_stats`, `date_time_math`. Third-party tools come from MCP connectors,
which users connect and enable per employee in the UI.

## Playbooks

Markdown decision trees: numbered steps, branching conditions ("is it a duplicate
charge? → …"), and the reasoning an expert applies. Write _how to decide_, not just
facts. See [`agents/customer-support/playbooks/`](../agents/customer-support/playbooks/)
for the reference examples.

## Knowledge

Plain Markdown. Prefer small, focused documents with clear headings — they chunk
and re-rank better than long omnibus files.

## Evals

Each employee needs eval sets in [`evals/`](../evals/) (`<id>.json` and
`<id>-grounded.json`). A new or changed employee ships only if success rate holds
or improves across the frontier, mid and cheap tiers (`npm run eval`).

## Adding an employee

1. Create `agents/<id>/` with the files above.
2. `npm run db:seed` to load it, `npm run ingest -- --agent <id>` to embed its knowledge.
3. Add eval sets and run `npm run eval`.
