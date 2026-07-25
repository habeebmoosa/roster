export interface RankedCandidate {
  id: string;
  sourceUri: string;
  kind: string;
  content: string;
  permissions: string[];
}

/**
 * Reciprocal Rank Fusion constant. Standard choice for hybrid search — large
 * enough that a candidate ranked highly in only one list still competes
 * fairly against one ranked lower in both.
 */
const RRF_K = 60;

/**
 * Merge ranked candidate lists (e.g. vector similarity + full-text) into one
 * ranked set via Reciprocal Rank Fusion: score = sum of 1/(k + rank) across
 * every list a candidate appears in. Uses rank position only, not raw scores
 * — vector cosine similarity and ts_rank live on incomparable scales, so
 * fusing by score directly would be meaningless.
 */
export function reciprocalRankFusion(lists: RankedCandidate[][], limit: number): RankedCandidate[] {
  const fusedScores = new Map<string, number>();
  const byId = new Map<string, RankedCandidate>();

  for (const list of lists) {
    list.forEach((candidate, rank) => {
      byId.set(candidate.id, candidate);
      fusedScores.set(candidate.id, (fusedScores.get(candidate.id) ?? 0) + 1 / (RRF_K + rank + 1));
    });
  }

  return [...fusedScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => byId.get(id)!);
}
