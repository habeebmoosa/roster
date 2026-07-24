import Link from "next/link";
import { Card } from "@/ui";
import { cn } from "@/lib/cn";

interface QuickAction {
  label: string;
  href: string;
  enabled: boolean;
}

// Hire (6.10) isn't built yet — same disabled/"Soon" treatment as the
// sidebar, so it isn't a dead link.
const ACTIONS: QuickAction[] = [
  { label: "Hire an employee", href: "/hire", enabled: false },
  { label: "Add a connector", href: "/connectors", enabled: true },
  { label: "Open settings", href: "/settings", enabled: true },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {ACTIONS.map((action) =>
        action.enabled ? (
          <Link key={action.label} href={action.href}>
            <Card className="hover:border-accent/50 p-4 text-center text-sm font-semibold transition-colors">
              {action.label}
            </Card>
          </Link>
        ) : (
          <Card
            key={action.label}
            className={cn(
              "text-text-faint p-4 text-center text-sm font-semibold",
              "cursor-not-allowed",
            )}
            title="Coming soon"
          >
            {action.label}
          </Card>
        ),
      )}
    </div>
  );
}
