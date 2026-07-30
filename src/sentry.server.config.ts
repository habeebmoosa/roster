import * as Sentry from "@sentry/nextjs";

// A DSN isn't secret (it only allows sending events), so it's read directly
// as a NEXT_PUBLIC_ var and shared with the client config rather than
// duplicated as a separate server-only secret. Sentry.init no-ops safely
// when dsn is empty/undefined — no explicit "is this configured" branch needed.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Error tracking only for this MVP — no performance/tracing spend.
  tracesSampleRate: 0,
});
