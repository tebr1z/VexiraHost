-- AlterTable
ALTER TABLE "hosting_accounts" ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "addon_services" ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT true;
