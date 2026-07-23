import { Badge, Card, CardTitle } from "@/ui";
import type { ActivityEntry } from "../detail-types";

export function DetailAboutTab({
  identity,
  voice,
  expertise,
  abilities,
  recentActivity,
}: {
  identity: string;
  voice: string;
  expertise: string[];
  abilities: string[];
  recentActivity: ActivityEntry[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>About</CardTitle>
        <p className="text-text mt-3 text-sm leading-relaxed">{identity}</p>
        <p className="text-text-muted border-border mt-3 border-l-2 pl-3 text-sm italic">
          &ldquo;{voice}&rdquo;
        </p>

        {expertise.length > 0 ? (
          <div className="mt-4">
            <p className="text-text-faint text-xs font-medium tracking-wide uppercase">Expertise</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {expertise.map((item) => (
                <Badge key={item} variant="accent">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {abilities.length > 0 ? (
          <div className="mt-4">
            <p className="text-text-faint text-xs font-medium tracking-wide uppercase">Abilities</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {abilities.map((item) => (
                <Badge key={item} variant="neutral">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardTitle>Recent activity</CardTitle>
        <ul className="divide-border mt-3 divide-y">
          {recentActivity.map((entry, i) => (
            <li key={i} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-text">{entry.text}</span>
              <span className="text-text-faint shrink-0">{entry.time}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
