"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Catches errors that escape the root layout itself (rare — most errors are
 * caught by the (app)/(marketing) route-group boundaries below). Next.js
 * requires this to render its own <html>/<body>, since it replaces the whole
 * layout tree when triggered — kept deliberately minimal and self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-bg text-text flex min-h-screen items-center justify-center p-6 font-sans">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-text-muted mt-2 text-sm">
            We&apos;ve been notified and are looking into it.
          </p>
          <button
            type="button"
            onClick={reset}
            className="bg-accent text-accent-contrast mt-4 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
