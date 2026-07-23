/**
 * Deterministic string hash used to derive stable, plausible-looking fixture
 * data from an id (agent id, conversation id, ...) — same input always
 * produces the same "random-looking" output, with zero storage needed.
 */
export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}
