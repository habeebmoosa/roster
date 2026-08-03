import type { BadgeVariant } from "@/ui";

export interface TrustTierCopy {
  label: string;
  variant: BadgeVariant;
  disclaimer: string;
}

const TRUST_TIER_COPY: Record<string, TrustTierCopy> = {
  verified: {
    label: "Verified",
    variant: "success",
    disclaimer: "This connector is maintained by a known vendor and reviewed by Roster.",
  },
  community: {
    label: "Community",
    variant: "accent",
    disclaimer:
      "This connector is publicly documented by its vendor but hasn't been independently verified by Roster. Review its permissions before connecting.",
  },
  custom: {
    label: "Custom",
    variant: "neutral",
    disclaimer: "You added this server yourself. Roster has no relationship with its operator.",
  },
};

/** The single source of trust-tier label/badge-color/disclaimer copy — every surface that renders a trust badge (the directory card, the detail dialog, the two agent↔connector pickers) reads from here. */
export function trustTierCopy(trustTier: string): TrustTierCopy {
  return TRUST_TIER_COPY[trustTier] ?? TRUST_TIER_COPY.custom!;
}
