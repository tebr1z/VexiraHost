-- CreateEnum
CREATE TYPE "TicketRelatedServiceType" AS ENUM ('HOSTING', 'SERVER', 'DOMAIN', 'ADDON');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "relatedServiceType" "TicketRelatedServiceType";
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "relatedServiceId" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "relatedServiceLabel" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tickets_relatedServiceType_relatedServiceId_idx" ON "tickets"("relatedServiceType", "relatedServiceId");
