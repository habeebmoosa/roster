export interface ActivityEntry {
  text: string;
  time: string;
}

/**
 * Everything on the employee detail screen we don't track yet: usage stats,
 * activity feed, and the provider/tier/model an agent defaults to (no
 * per-agent default-model binding exists until Phase 9). Deterministic per
 * agent id — see fixtures.ts's hashString.
 */
export interface WorkerDetailFixtures {
  status: "Active";
  conversations30d: number;
  spend30dUsd: number;
  tokens30dLabel: string;
  uptimePct: number;
  provider: string;
  tier: string;
  model: string;
  recentActivity: ActivityEntry[];
}
