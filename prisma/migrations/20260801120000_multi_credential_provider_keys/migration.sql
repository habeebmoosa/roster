-- AddColumn (nullable first so we can backfill before enforcing NOT NULL)
ALTER TABLE "provider_keys" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: every row created before this migration was the only credential
-- for its (userId, provider) pair (the old schema enforced that), so it is
-- unambiguously that provider's default credential.
UPDATE "provider_keys" SET "isDefault" = true;
UPDATE "provider_keys" SET "label" = 'Default' WHERE "label" IS NULL;

-- Now safe to enforce NOT NULL on label.
ALTER TABLE "provider_keys" ALTER COLUMN "label" SET NOT NULL;

-- DropIndex (old constraint: one credential per user+provider)
DROP INDEX "provider_keys_userId_provider_key";

-- DropIndex (replaced by a composite index scoped to provider lookups)
DROP INDEX "provider_keys_userId_idx";

-- CreateIndex (a user may now have several credentials per provider, disambiguated by label)
CREATE UNIQUE INDEX "provider_keys_userId_provider_label_key" ON "provider_keys"("userId", "provider", "label");

-- CreateIndex
CREATE INDEX "provider_keys_userId_provider_idx" ON "provider_keys"("userId", "provider");
