/**
 * A worker (employee) row. `id`/`name`/`role`/`model` come from the real
 * Agent table (`model` is null until someone sets a default via the Model
 * tab or hire wizard). `conversations30d`/`lastActivity` are real, from
 * `Conversation.createdAt`/`updatedAt`. `spendUsd` is real too, from
 * `UsageEvent` — null when the agent has no *priced* usage in the window
 * (no usage at all, or only an uncatalogued model), never a guessed number.
 * `status` is honestly "Active" for every agent today — there's no
 * pause/disable concept yet.
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
