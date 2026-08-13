-- AlterTable
ALTER TABLE "domains" ADD COLUMN "expiredAt" TIMESTAMP(3);
ALTER TABLE "domains" ADD COLUMN "lateFeeAppliedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "DomainExpiryReminderKind" AS ENUM (
  'PRE_30',
  'PRE_20',
  'PRE_15',
  'PRE_10',
  'PRE_5',
  'PRE_3',
  'PRE_2',
  'PRE_1',
  'EXPIRED',
  'EXPIRED_7',
  'EXPIRED_10',
  'EXPIRED_15',
  'DELETED'
);

-- CreateTable
CREATE TABLE "domain_expiry_reminders" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "kind" "DomainExpiryReminderKind" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_expiry_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domain_expiry_reminders_domainId_kind_key" ON "domain_expiry_reminders"("domainId", "kind");

-- CreateIndex
CREATE INDEX "domain_expiry_reminders_domainId_idx" ON "domain_expiry_reminders"("domainId");

-- AddForeignKey
ALTER TABLE "domain_expiry_reminders" ADD CONSTRAINT "domain_expiry_reminders_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
