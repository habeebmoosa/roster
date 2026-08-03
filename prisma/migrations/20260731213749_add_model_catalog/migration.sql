-- NOTE: prisma migrate dev's diff also proposed `DROP INDEX
-- "agent_knowledge_embedding_hnsw"` here — a false positive, since that index
-- is raw SQL (see 20260724213249_add_agent_knowledge_and_episodic_memory) and
-- invisible to Prisma's schema diff. Intentionally omitted — see
-- 20260725204156_eval_run_avg_cost_usd for the same note on an earlier migration.

-- CreateTable
CREATE TABLE "model_catalog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "contextWindow" INTEGER,
    "maxOutputTokens" INTEGER,
    "inputModalities" TEXT[],
    "outputModalities" TEXT[],
    "reasoningSupport" BOOLEAN NOT NULL DEFAULT false,
    "toolCallSupport" BOOLEAN NOT NULL DEFAULT false,
    "structuredOutputSupport" BOOLEAN NOT NULL DEFAULT false,
    "openWeights" BOOLEAN NOT NULL DEFAULT false,
    "inputPricePerMTok" DOUBLE PRECISION,
    "outputPricePerMTok" DOUBLE PRECISION,
    "cacheReadPricePerMTok" DOUBLE PRECISION,
    "cacheWritePricePerMTok" DOUBLE PRECISION,
    "knowledgeCutoff" TEXT,
    "releaseDate" TEXT,
    "source" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "model_catalog_provider_idx" ON "model_catalog"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "model_catalog_provider_modelId_key" ON "model_catalog"("provider", "modelId");
