"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/ui";

/** Covers every authenticated route (chat, dashboard, hire, workers, settings, connectors, evals). */
export default function AppError({
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
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <h1 className="text-text text-lg font-semibold">Something went wrong</h1>
      <p className="text-text-muted mt-2 max-w-sm text-sm">
        We&apos;ve been notified and are looking into it. Your data is safe.
      </p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
