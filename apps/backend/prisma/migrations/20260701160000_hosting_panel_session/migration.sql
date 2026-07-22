-- AlterTable
ALTER TABLE "hosting_accounts" ADD COLUMN "panelSessionTokenEnc" TEXT;
ALTER TABLE "hosting_accounts" ADD COLUMN "panelSessionExpiresAt" TIMESTAMP(3);
