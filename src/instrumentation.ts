import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Reports errors from nested React Server Components that framework-level
// boundaries (error.tsx) can't catch on their own — Next.js's own hook for this.
export const onRequestError = Sentry.captureRequestError;
