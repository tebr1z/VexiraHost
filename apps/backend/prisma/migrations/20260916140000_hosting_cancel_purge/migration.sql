ALTER TABLE "hosting_accounts" ADD COLUMN IF NOT EXISTS "cancelApprovedAt" TIMESTAMP(3);
ALTER TABLE "hosting_accounts" ADD COLUMN IF NOT EXISTS "scheduledPurgeAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "hosting_accounts_scheduledPurgeAt_idx" ON "hosting_accounts"("scheduledPurgeAt");
