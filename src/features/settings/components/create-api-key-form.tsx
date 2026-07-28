"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "@/hooks/use-toast";
import { Button, CardDescription, Input, Modal } from "@/ui";

export function CreateApiKeyForm() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const [rawKey, setRawKey] = useState<string | null>(null);

  function openModal() {
    setName("");
    setStatus("idle");
    setMessage("");
    setRawKey(null);
    setModalOpen(true);
  }

  function closeModal() {
    // Guarded on the previous open state so this stays a no-op the second
    // time: the "Done" button calls this directly, and the dialog's native
    // close event (Modal's onClose) fires it again right after via the
    // open-prop effect — only the first call should trigger a refresh.
    setModalOpen((wasOpen) => {
      if (wasOpen && rawKey) router.refresh();
      return false;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error?.message ?? "Failed to create key.");
        return;
      }
      setStatus("idle");
      setRawKey(data.rawKey);
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  async function copyKey() {
    if (!rawKey) return;
    try {
      await navigator.clipboard.writeText(rawKey);
      toast({ title: "Copied to clipboard", variant: "success" });
    } catch {
      toast({ title: "Couldn't copy — select and copy manually.", variant: "danger" });
    }
  }

  return (
    <>
      <Button onClick={openModal}>+ Create API key</Button>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={rawKey ? "Key created" : "Create API key"}
      >
        {rawKey ? (
          <div className="flex flex-col gap-3">
            <CardDescription className="mb-0">
              Copy this key now — you won&apos;t be able to see it again.
            </CardDescription>
            <div className="bg-bg-subtle overflow-x-auto rounded-md p-3">
              <code className="text-text font-mono text-xs break-all">{rawKey}</code>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={copyKey}>
                Copy
              </Button>
              <Button onClick={closeModal}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="grid gap-1 text-sm">
              <span className="text-text font-medium">Name</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production"
                autoFocus
              />
            </label>
            <div className="flex items-center justify-end gap-2">
              {message ? (
                <span className="text-danger text-sm" role="status">
                  {message}
                </span>
              ) : null}
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={status === "saving"}>
                {status === "saving" ? "Creating…" : "Create key"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
