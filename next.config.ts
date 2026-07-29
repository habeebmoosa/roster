import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The agent engine (src/core) and generated Prisma client run on Node, not Edge.
  // pdf-parse ships a conditional "browser" export that Next's RSC bundler picks over
  // the Node build when webpack-bundled, breaking at import time — external it so Node's
  // own require() resolves it correctly instead.
  serverExternalPackages: ["@prisma/client", "pdf-parse"],
};

// Source-map upload only activates when SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT
// are set (e.g. in CI) — the plugin reads those env vars itself and no-ops for
// plain local builds, same "configured or inert" treatment as Upstash/rate limiting.
export default withSentryConfig(nextConfig, {
  silent: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
      // Error tracking only for this MVP (tracesSampleRate: 0 everywhere) — safe to treeshake.
      removeTracing: true,
    },
  },
});
