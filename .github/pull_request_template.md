## What & why

<!-- What does this change, and why? Link the issue if there is one. -->

## Checklist

- [ ] `npm run lint`, `npm run typecheck`, `npm run test` pass
- [ ] `npm run test:integration` passes (if DB/engine code changed)
- [ ] Tests added or updated
- [ ] If this changes engine behavior (retrieval, workflow, playbooks, prompts): eval impact described — success rate must hold or improve across tiers
- [ ] `core/` still has no imports from `app/` or Next.js
- [ ] No secrets, keys, or personal data in the diff
