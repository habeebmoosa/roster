import * as Sentry from "@sentry/nextjs";

// Same config as sentry.server.config.ts — kept as a separate file because
// Next.js loads a distinct config per runtime (nodejs vs edge) via instrumentation.ts.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
});
