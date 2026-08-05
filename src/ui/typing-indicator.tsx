import { cn } from "@/lib/cn";

/** Three staggered bouncing dots — the "waiting for a response" state, replacing a static placeholder. */
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1 py-1", className)} role="status">
      <span className="sr-only">Thinking…</span>
      <span aria-hidden="true" className="bg-text-faint h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
      <span aria-hidden="true" className="bg-text-faint h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
      <span aria-hidden="true" className="bg-text-faint h-1.5 w-1.5 animate-bounce rounded-full" />
    </div>
  );
}
