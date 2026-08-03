"use client";

import { useMemo, useState } from "react";
import { getProviderCatalog, type ProviderCatalogEntry, type ProviderCategory } from "@/core/providers/catalog";
import { Input } from "@/ui";
import { ProviderLogo } from "./provider-logo";

const CATEGORY_ORDER: ProviderCategory[] = [
  "frontier",
  "fast-open-weight",
  "aggregator",
  "enterprise",
  "self-hosted",
];

const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  frontier: "Frontier",
  "fast-open-weight": "Fast & open-weight",
  aggregator: "Aggregators",
  enterprise: "Enterprise & cloud",
  "self-hosted": "Self-hosted",
};

export function ProviderPickerGrid({ onSelect }: { onSelect: (provider: ProviderCatalogEntry) => void }) {
  const [query, setQuery] = useState("");
  const catalog = getProviderCatalog();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? catalog.filter((c) => c.label.toLowerCase().includes(q)) : catalog;
    const byCategory = new Map<ProviderCategory, ProviderCatalogEntry[]>();
    for (const entry of filtered) {
      const list = byCategory.get(entry.category) ?? [];
      list.push(entry);
      byCategory.set(entry.category, list);
    }
    return byCategory;
  }, [catalog, query]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="p-6 md:p-8">
        <h2 className="text-text text-xl font-semibold">Add a provider</h2>
        <p className="text-text-muted mt-1 text-sm">
          Bring your own key for any of these — or connect a custom OpenAI-compatible endpoint.
        </p>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search providers…"
          className="mt-4"
          autoFocus
        />

        <div className="mt-6 flex flex-col gap-8">
          {CATEGORY_ORDER.map((category) => {
            const items = groups.get(category);
            if (!items || items.length === 0) return null;
            return (
              <section key={category}>
                <h3 className="text-text-faint text-xs font-bold tracking-wider uppercase">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {items.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onSelect(entry)}
                      className="border-border bg-bg-elevated hover:bg-bg-subtle flex items-center gap-3 rounded-xl border p-3 text-left transition"
                    >
                      <ProviderLogo id={entry.id} label={entry.label} className="h-9 w-9" />
                      <span className="text-text truncate text-sm font-medium">{entry.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
          {groups.size === 0 ? (
            <p className="text-text-muted text-sm">No providers match &ldquo;{query}&rdquo;.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
