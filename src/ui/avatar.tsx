import { cn } from "@/lib/cn";

export type AvatarSize = "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-12 w-12 text-lg",
};

export interface AvatarProps {
  name?: string | null;
  size?: AvatarSize;
  className?: string;
}

/**
 * Initials avatar — avoids remote-image config and keeps the UI kit light.
 * Size is a variant (not a className override): appending e.g. "h-6 w-6" via
 * className wouldn't reliably beat the base classes since both are
 * same-specificity utilities and Tailwind's generated order decides ties.
 */
export function Avatar({ name, size = "md", className }: AvatarProps) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <span
      className={cn(
        "bg-accent text-accent-contrast inline-flex items-center justify-center rounded-full font-medium",
        sizeClasses[size],
        className,
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}
