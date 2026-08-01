export interface ActivityEntry {
  text: string;
  time: string;
}

/**
 * Everything on the employee detail screen we don't track yet: usage stats
 * and the activity feed. Deterministic per agent id — see fixtures.ts's
 * hashString. The default provider/model is real data now (Agent.definition.model,
 * see the worker detail page's Model tab) and deliberately has no fixture
 * fallback — showing realistic-looking fake data in its place would be
 * indistinguishable from an actually-configured default.
 */
export interface WorkerDetailFixtures {
  status: "Active";
  conversations30d: number;
  spend30dUsd: number;
  tokens30dLabel: string;
  uptimePct: number;
  recentActivity: ActivityEntry[];
}
