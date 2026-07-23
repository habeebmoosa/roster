import type { SVGProps } from "react";

/**
 * Minimal hand-rolled line icons (stroke = currentColor) — no icon library
 * dependency, keeps the bundle light. Size/color are controlled via className
 * on the consumer side (e.g. "h-4 w-4 text-text-faint").
 */
type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function IconOverview(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.7" />
      <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.7" />
      <rect x="13" y="10.5" width="7.5" height="10" rx="1.7" />
      <rect x="3.5" y="13.5" width="7.5" height="7" rx="1.7" />
    </svg>
  );
}

export function IconRoster(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <circle cx="17" cy="7" r="2.4" />
      <path d="M15.8 14.7c2.6.2 4.7 2.3 4.7 5.3" />
    </svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
    </svg>
  );
}

export function IconConnectors(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 3v4M15 3v4M6.5 7h11a1.5 1.5 0 0 1 1.5 1.5v3A6 6 0 0 1 13 17.5v3.5M13 17.5h-2A6 6 0 0 1 5 11.5v-3A1.5 1.5 0 0 1 6.5 7Z" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.9a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.1a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 5.75 8.4a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.15A1.7 1.7 0 0 0 11.19 2.1h.09" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={2.4}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9.5 6l6 6-6 6" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" />
    </svg>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <path d="M12 2.5 13.8 9l6.2 1.8-6.2 1.8L12 19l-1.8-6.4L4 10.8 10.2 9 12 2.5Z" />
    </svg>
  );
}

export function IconLogOut(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 20H6.5A1.5 1.5 0 0 1 5 18.5v-13A1.5 1.5 0 0 1 6.5 4H9" />
      <path d="M14.5 16l4.5-4-4.5-4" />
      <line x1="19" y1="12" x2="9" y2="12" />
    </svg>
  );
}
