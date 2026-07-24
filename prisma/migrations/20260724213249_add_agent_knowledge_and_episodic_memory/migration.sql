-- CreateTable
CREATE TABLE "agent_knowledge" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceUri" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "embeddingProvider" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodic_memory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "episodic_memory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_knowledge_agentId_kind_idx" ON "agent_knowledge"("agentId", "kind");

-- CreateIndex (HNSW cosine similarity search, mirrors embedding_probe_embedding_hnsw)
CREATE INDEX "agent_knowledge_embedding_hnsw"
    ON "agent_knowledge"
    USING hnsw ("embedding" vector_cosine_ops);

-- CreateIndex (Postgres full-text / BM25-style search over chunk content)
CREATE INDEX "agent_knowledge_content_fts"
    ON "agent_knowledge"
    USING gin (to_tsvector('english', "content"));

-- CreateIndex
CREATE INDEX "episodic_memory_userId_agentId_idx" ON "episodic_memory"("userId", "agentId");

-- CreateIndex
CREATE UNIQUE INDEX "episodic_memory_userId_agentId_key_key" ON "episodic_memory"("userId", "agentId", "key");

-- AddForeignKey
ALTER TABLE "agent_knowledge" ADD CONSTRAINT "agent_knowledge_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodic_memory" ADD CONSTRAINT "episodic_memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodic_memory" ADD CONSTRAINT "episodic_memory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
