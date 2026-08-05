-- NOTE: prisma migrate dev's diff also proposed `DROP INDEX
-- "agent_knowledge_embedding_hnsw"` here — a false positive, since that index
-- is raw SQL (see 20260724213249_add_agent_knowledge_and_episodic_memory) and
-- invisible to Prisma's schema diff. Intentionally omitted — see
-- 20260725204156_eval_run_avg_cost_usd for the same note on an earlier migration.

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
