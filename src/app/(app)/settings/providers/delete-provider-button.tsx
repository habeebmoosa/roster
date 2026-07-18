"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/ui";

export function DeleteProviderButton({ provider }: { provider: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    setBusy(true);
    try {
      await fetch(`/api/providers/${encodeURIComponent(provider)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" onClick={onDelete} disabled={busy}>
      {busy ? "Removing…" : "Remove"}
    </Button>
  );
}
