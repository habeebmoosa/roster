-- CreateTable
CREATE TABLE "provider_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT,
    "encryptedKey" TEXT NOT NULL,
    "baseUrl" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_keys_userId_idx" ON "provider_keys"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_keys_userId_provider_key" ON "provider_keys"("userId", "provider");

-- AddForeignKey
ALTER TABLE "provider_keys" ADD CONSTRAINT "provider_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
