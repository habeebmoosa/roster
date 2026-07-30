-- Enable pgvector. Must run before any `vector` column is created.
-- Custom addition (Prisma has no native vector type yet — MVP-Plan §5).
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "embedding_probe" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embedding_probe_pkey" PRIMARY KEY ("id")
);

-- Approximate-nearest-neighbour index for cosine distance (<=>).
-- Custom addition — Prisma does not emit vector indexes.
CREATE INDEX "embedding_probe_embedding_hnsw"
    ON "embedding_probe"
    USING hnsw ("embedding" vector_cosine_ops);
