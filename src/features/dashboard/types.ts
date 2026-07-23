/**
 * A roster-preview row. `id`/`name`/`role` come from the real Agent table;
 * `model`/`lastActivity`/`spend` are fixtures until per-agent default model
 * selection (Phase 9) and conversation/usage tracking (Phase 10/11) exist.
 * `status` is honestly "Active" for every agent today — there's no
 * pause/disable concept yet (arrives with the employee detail screen, 6.6).
 */
export interface RosterPreviewRow {
  id: string;
  name: string;
  role: string;
  status: "Active";
  model: string;
  lastActivity: string;
  spendUsd: number;
}

/** "Usage & cost" per-employee breakdown — fixture until Phase 11 billing. */
export interface UsageEntry {
  name: string;
  spendUsd: number;
}
