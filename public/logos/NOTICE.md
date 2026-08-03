# Provider logos

The SVG files in this directory are vendor brand marks sourced from
[lobehub/lobe-icons](https://github.com/lobehub/lobe-icons)
(`@lobehub/icons-static-svg`, MIT licensed), copied at build time rather than
imported as a runtime dependency — Next.js serves static assets from
`public/`, and these are a small, fixed set.

Each file is named after its provider's catalog id in
`src/core/providers/catalog.ts` (e.g. `openai.svg` ↔ `id: "openai"`), which
is how `ProviderLogo` (`src/features/providers/components/provider-logo.tsx`)
looks them up.

To add or refresh a logo: `npm install -D @lobehub/icons-static-svg`, copy the
wanted file from `node_modules/@lobehub/icons-static-svg/icons/` here, and
rename it to match the provider's catalog id.

MIT License — Copyright (c) LobeHub <i@lobehub.com>
