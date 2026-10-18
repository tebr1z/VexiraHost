ALTER TABLE "domains"
  ADD COLUMN "dnssecEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "dnssecStatus" TEXT,
  ADD COLUMN "dnssecDsRecords" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "dnssecUpdatedAt" TIMESTAMP(3);
