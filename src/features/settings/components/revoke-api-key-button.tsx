"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/ui";

export function RevokeApiKeyButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onRevoke() {
    setBusy(true);
    try {
      await fetch(`/api/api-keys/${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="danger" onClick={onRevoke} disabled={busy}>
      {busy ? "Revoking…" : "Revoke"}
    </Button>
  );
}
