-- CreateTable
CREATE TABLE "eval_runs" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "modelTier" TEXT NOT NULL,
    "modelLabel" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "passed" INTEGER NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL,
    "avgTokens" DOUBLE PRECISION NOT NULL,
    "avgLatencyMs" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eval_runs_agentId_modelTier_idx" ON "eval_runs"("agentId", "modelTier");
