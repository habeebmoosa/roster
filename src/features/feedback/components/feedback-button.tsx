"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@/hooks/use-toast";
import { Button, Modal, Textarea } from "@/ui";

/** A small, always-visible feedback entry point — floats above the app shell on every authenticated page. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");

  function openModal() {
    setMessage("");
    setStatus("idle");
    setOpen(true);
  }

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
      setOpen(false);
      toast({ title: "Thanks for the feedback!", variant: "success" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        className="fixed right-4 bottom-4 z-40 shadow-md"
        onClick={openModal}
      >
        Feedback
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Send feedback">
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
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
