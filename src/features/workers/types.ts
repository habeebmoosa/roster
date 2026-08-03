/**
 * A worker (employee) row. `id`/`name`/`role`/`model` come from the real
 * Agent table (`model` is null until someone sets a default via the Model
 * tab or hire wizard). `conversations30d`/`lastActivity`/`spendUsd` are also
 * null — no conversation/usage-tracking pipeline exists yet (Phase 10/11) —
 * rendered as an honest empty state, never a fabricated number. `status` is
 * honestly "Active" for every agent today — there's no pause/disable
 * concept yet (Phase 9's employee detail screen introduces it).
 */
export interface WorkerRow {
  id: string;
  name: string;
  role: string;
  status: "Active";
  model: string | null;
  conversations30d: number | null;
  lastActivity: string | null;
  spendUsd: number | null;
}
