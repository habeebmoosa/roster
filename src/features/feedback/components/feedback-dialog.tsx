"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "@/hooks/use-toast";
import { Button, Modal, Textarea } from "@/ui";

/** Controlled feedback form — opened from the profile menu. */
export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");

  // Fresh form every time the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setMessage("");
      setStatus("idle");
    }
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      onClose();
      toast({ title: "Thanks for the feedback!", variant: "success" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send feedback">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          required
          autoFocus
        />
        <div className="flex items-center justify-end gap-2">
          {status === "error" ? (
            <span className="text-danger text-sm" role="status">
              Couldn&apos;t send — try again.
            </span>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
