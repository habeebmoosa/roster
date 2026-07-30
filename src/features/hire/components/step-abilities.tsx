import { CardDescription, CardTitle, Switch } from "@/ui";
import { ABILITIES_CATALOG } from "../fixtures";

// The built-in-tool entries in ABILITIES_CATALOG are real (core/tools/registry.ts,
// resolved per-turn in server/agents/service.ts) — toggling one genuinely enables it.
// The other entries are still descriptive-only.
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
      <CardDescription>Choose which tools this employee can use.</CardDescription>

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
