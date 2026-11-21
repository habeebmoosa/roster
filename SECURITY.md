# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Report them
privately through GitHub's
[private vulnerability reporting](https://github.com/habeebmoosa/roster/security/advisories/new)
(Security tab → "Report a vulnerability"), or email **SECURITY_CONTACT_EMAIL**
(replace before publishing).

Include what you found, how to reproduce it, and the impact. We aim to
acknowledge reports within 3 business days and to ship a fix or mitigation for
confirmed issues promptly, crediting reporters who want credit.

## Why this matters for Roster

Roster stores users' third-party LLM API keys and MCP connector credentials.
The relevant design:

- **Provider keys and MCP credentials** are encrypted at rest with AES-256-GCM
  using the server-side `ENCRYPTION_KEY`, are never logged, and are decrypted
  only inside the request that needs them (`src/server/crypto/vault.ts`).
- **Platform API keys** are stored as SHA-256 hashes and shown once.
- **MCP OAuth** uses PKCE (S256) and the RFC 8707 `resource` parameter.
- **Knowledge retrieval** is permission-scoped in SQL.

Anything that weakens these guarantees (key disclosure, auth bypass,
cross-user data access, SSRF through custom connector URLs, prompt-injection
paths that exfiltrate credentials) is in scope.

## Operating your own instance

- Generate `AUTH_SECRET` and `ENCRYPTION_KEY` with the commands in `.env.example`.
- **Back up `ENCRYPTION_KEY`.** Losing or rotating it makes stored provider keys
  undecryptable.
- Never commit `.env`. Use a secrets manager in production.
- Run `npx prisma migrate deploy` (never `migrate dev`) against production.

## Supported versions

Only the latest release on `main` receives security fixes while the project is
pre-1.0.
