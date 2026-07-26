# Curated MCP server directory

Each `*.json` file here is a definition for one curated directory entry — the
same "definitions-as-files, DB is a materialized copy" pattern `agents/` uses
for employees (see `prisma/seed.ts`, `src/core/mcp/directory-loader.ts`).

**`connectorUrl` values are not independently verified.** They reflect each
vendor's publicly documented remote MCP endpoint as best known at the time
these files were written. Before enabling any of these in a real environment:
confirm the URL is still correct, confirm the auth flow actually works
against it, and update `tools`/`resources` from a real `tools/list` /
`resources/list` call (which is exactly what happens automatically the first
time a user connects — `cachedTools`/`cachedResources` in the DB get
overwritten with the live result).

Fields:

- `id` — kebab-case slug, becomes the `McpServer.id` primary key.
- `authType` — `"oauth_dcr"` | `"static_headers"` | `"none"`.
- `trustTier` — `"verified"` | `"community"` | `"custom"`. Reflects Roster's
  confidence in the _integration_ (a well-known vendor with a documented MCP
  offering), not confidence in the exact URL above — see the caveat.
- `tools` / `resources` — a hand-curated, representative (not exhaustive)
  snapshot for the Connectors UI to render before a user has ever connected.
