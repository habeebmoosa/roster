-- AlterTable
ALTER TABLE "eval_runs" ADD COLUMN     "avgCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- NOTE: prisma migrate dev's diff also proposed `DROP INDEX
-- "agent_knowledge_embedding_hnsw"` here — a false positive. That index is
-- raw SQL (see 20260724213249_add_agent_knowledge_and_episodic_memory) since
-- Prisma can't represent `USING hnsw` declaratively, so it's invisible to the
-- schema diff and gets flagged for removal on every unrelated migration.
-- Intentionally omitted — the index must stay for hybrid-search performance.
