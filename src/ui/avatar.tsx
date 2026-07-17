import { cn } from "@/lib/cn";

/** Initials avatar — avoids remote-image config and keeps the UI kit light. */
export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <span
      className={cn(
        "bg-brand inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white",
        className,
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}
