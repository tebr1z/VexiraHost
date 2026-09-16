-- AlterTable
ALTER TABLE "hosting_accounts" ADD COLUMN "cancelApprovedAt" TIMESTAMP(3);
ALTER TABLE "hosting_accounts" ADD COLUMN "scheduledPurgeAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "hosting_accounts_scheduledPurgeAt_idx" ON "hosting_accounts"("scheduledPurgeAt");
