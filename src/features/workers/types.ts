/**
 * A worker (employee) row. `id`/`name`/`role` come from the real Agent
 * table; `model`/`conversations30d`/`lastActivity`/`spendUsd` are fixtures
 * until per-agent default model selection (Phase 9) and conversation/usage
 * tracking (Phase 10/11) exist. `status` is honestly "Active" for every
 * agent today — there's no pause/disable concept yet (Phase 9's employee
 * detail screen introduces it).
 */
export interface WorkerRow {
  id: string;
  name: string;
  role: string;
  status: "Active";
  model: string;
  conversations30d: number;
  lastActivity: string;
  spendUsd: number;
}
