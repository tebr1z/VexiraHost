-- AlterEnum
ALTER TYPE "ServiceStatus" ADD VALUE IF NOT EXISTS 'FAILED';

-- AlterTable
ALTER TABLE "hosting_accounts" ADD COLUMN IF NOT EXISTS "provisionStage" TEXT;
ALTER TABLE "hosting_accounts" ADD COLUMN IF NOT EXISTS "provisionError" TEXT;

-- AlterTable
ALTER TABLE "hosting_plans" ADD COLUMN IF NOT EXISTS "pleskPlanName" TEXT;
