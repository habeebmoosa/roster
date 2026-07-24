import type { ComponentType, SVGProps } from "react";
import { IconChat, IconConnectors, IconOverview, IconSettings, IconWorkers } from "./icons";

export interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** False renders a disabled row with a "Soon" badge instead of a link. */
  enabled: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Single source of truth for the sidebar nav. Flip `enabled` to true as each
 * screen's sub-phase lands (MVP-Plan Phase 6) — no other file needs to change.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operate",
    items: [
      { href: "/dashboard", label: "Overview", Icon: IconOverview, enabled: true },
      { href: "/workers", label: "Workers", Icon: IconWorkers, enabled: true },
      { href: "/chat", label: "Chat", Icon: IconChat, enabled: true },
    ],
  },
  {
    label: "Configure",
    items: [
      { href: "/connectors", label: "Connectors", Icon: IconConnectors, enabled: true },
      { href: "/settings", label: "Settings", Icon: IconSettings, enabled: true },
    ],
  },
];
