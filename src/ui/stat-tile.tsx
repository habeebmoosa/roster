import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./card";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  sublabel?: string;
  className?: string;
}

/** Dashboard stat tile: label, big value, optional sublabel. Composes Card. */
export function StatTile({ label, value, sublabel, className }: StatTileProps) {
  return (
    <Card className={cn("p-5", className)}>
      <p className="text-text-muted text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="text-text mt-2 text-2xl font-bold">{value}</p>
      {sublabel ? <p className="text-text-faint mt-1 text-sm">{sublabel}</p> : null}
    </Card>
  );
}
