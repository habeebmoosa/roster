import Link from "next/link";
import { Badge, Card, CardTitle } from "@/ui";

export function DetailModelTab({
  provider,
  tier,
  model,
}: {
  provider: string;
  tier: string;
  model: string;
}) {
  return (
    <Card>
      <CardTitle>Model</CardTitle>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-text text-sm font-semibold">{provider}</p>
            <Badge variant="neutral">{tier}</Badge>
          </div>
          <p className="text-text-muted mt-1 font-mono text-sm">{model}</p>
        </div>
        {/* Per-agent default model binding doesn't exist yet — this links to
            the real place a provider/model is actually managed today. */}
        <Link
          href="/settings/providers"
          className="text-accent text-sm font-medium hover:underline"
        >
          Change model →
        </Link>
      </div>
    </Card>
  );
}
