import { cn } from "@/lib/cn";

/** Loading placeholder block. Size/shape via className (e.g. "h-4 w-32 rounded-full"). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-bg-subtle animate-pulse rounded-md", className)} aria-hidden />;
}
