// Combining diacritical marks (U+0300-U+036F), stripped after NFKD
// normalization so e.g. "e with an acute accent" collapses to a plain "e"
// instead of being dropped as a non a-z0-9 character.
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/** Kebab-case an arbitrary display name into an id (matches agentDefinitionSchema's id regex). */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
