/** "Usage & cost" per-employee breakdown — spendUsd is null until real usage tracking exists (Phase 11 billing). */
export interface UsageEntry {
  id: string;
  name: string;
  spendUsd: number | null;
}
