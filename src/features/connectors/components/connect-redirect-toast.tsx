"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import type { Connector } from "../types";

/**
 * Reads the `?connected=`/`?error=` query params the OAuth callback route
 * redirects back with, surfaces a toast, then strips them from the URL.
 * Isolated from ConnectorsBoard so only this sliver needs a Suspense boundary
 * (useSearchParams requires one during static generation).
 */
export function ConnectRedirectToast({ connectors }: { connectors: Connector[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      const server = connectors.find((c) => c.id === connected);
      toast({ title: `Connected to ${server?.name ?? connected}`, variant: "success" });
    } else if (error) {
      toast({ title: "Couldn't connect", description: error, variant: "danger" });
    }
    if (connected || error) router.replace("/connectors");
    // Only re-run when the URL's query params actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}
