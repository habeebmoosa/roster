import { CardDescription, CardTitle, Switch } from "@/ui";
import { ABILITIES_CATALOG } from "../fixtures";

// The tool catalog itself is a fixture until Phase 9 (built-in + MCP/HTTP tools) — toggling
// one here only records its id on the definition; nothing executes until then.
export function StepAbilities({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (abilityId: string) => void;
}) {
  return (
    <div>
      <CardTitle>Abilities</CardTitle>
      <CardDescription>
        Choose which tools this employee can use. Tool execution lands in a later phase — this just
        records what&apos;s enabled.
      </CardDescription>

      <ul className="divide-border mt-4 divide-y">
        {ABILITIES_CATALOG.map((ability) => (
          <li key={ability.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-text text-sm font-medium">{ability.label}</p>
              <p className="text-text-muted text-sm">{ability.description}</p>
            </div>
            <Switch
              checked={selected.includes(ability.id)}
              onCheckedChange={() => onToggle(ability.id)}
              aria-label={ability.label}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
